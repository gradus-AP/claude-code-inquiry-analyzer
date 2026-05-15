---
description: CS問い合わせトピックの解約リスク分析を実行する。「XXXを分析して」と言われたときに使う。EDAデータ取得 → 仮説生成 → 仮説検証（3並列）→ レポート統合 → HTML出力の5ステップで動作する。
---

# CS分析エージェント — `/cs-analyze`

ユーザーが「{トピック名}を分析して」または `/cs-analyze {トピック}` と指示したとき、以下の5ステップを順番に実行してください。

---

## 事前確認

分析対象トピックを特定し、以下の8カテゴリのいずれかに対応させてください：

1. ログインできない
2. 機能の使い方
3. データエクスポート
4. API連携
5. 請求・支払い
6. 権限設定
7. パフォーマンス低下
8. 解約手続き

`job_id` を `job_` + ランダム8桁hex（例: `job_a3f2c891`）で生成し、`claude-code-inquiry-analyzer/reports/{job_id}/` ディレクトリを作成してください。

---

## Step 1: EDAデータ取得

Bash ツールで以下の Python スクリプトを実行し、基本統計を取得します。

```python
import sqlite3, pandas as pd, sys, json
sys.stdout.reconfigure(encoding='utf-8')

DB = 'claude-code-inquiry-analyzer/data/cs_poc.db'
TOPIC = 'ここをトピック名に置換（例: ログインできない）'
conn = sqlite3.connect(DB)

# 過去28日の対象トピック問い合わせ
df_28 = pd.read_sql(f"""
  SELECT i.*, c.billing_type, c.plan, c.renewal_date,
         CAST(julianday(c.renewal_date) - julianday('now') AS INTEGER) AS days_to_renewal,
         u.utilization_rate
  FROM inquiries i
  JOIN contracts c ON i.company_id = c.company_id
  LEFT JOIN (
    SELECT company_id, utilization_rate FROM usage
    WHERE year_month = (SELECT MAX(year_month) FROM usage)
  ) u ON i.company_id = u.company_id
  WHERE i.topic_ai = '{TOPIC}' AND i.date >= date('now', '-28 days')
""", conn)

# 月次トレンド（全期間）
df_trend = pd.read_sql(f"""
  SELECT strftime('%Y-%m', date) as ym, COUNT(*) as cnt
  FROM inquiries WHERE topic_ai = '{TOPIC}'
  GROUP BY ym ORDER BY ym
""", conn)

# service_changes（変化点照合用）
df_svc = pd.read_sql('SELECT * FROM service_changes ORDER BY date', conn)

# 問い合わせ増加判定（直近90日 vs 前90日）
df_cmp = pd.read_sql(f"""
  SELECT company_id,
    SUM(CASE WHEN date >= date('now','-90 days') THEN 1 ELSE 0 END) AS recent,
    SUM(CASE WHEN date >= date('now','-180 days') AND date < date('now','-90 days') THEN 1 ELSE 0 END) AS prev
  FROM inquiries WHERE topic_ai = '{TOPIC}'
  GROUP BY company_id
""", conn)
conn.close()

# 集計サマリー出力
print("=== 過去28日サマリー ===")
print(f"総件数: {len(df_28)}")
print(f"escalated率: {df_28['escalated'].mean():.1%}")
print(f"平均満足度: {df_28['satisfaction_score'].mean():.2f}")
print(f"billing_type分布:\n{df_28['billing_type'].value_counts()}")
print(f"priority分布:\n{df_28['priority'].value_counts()}")
print(f"plan分布:\n{df_28['plan'].value_counts()}")
print("\n=== 月次トレンド ===")
print(df_trend.to_string(index=False))
print("\n=== service_changes ===")
print(df_svc.to_string(index=False))
print("\n=== 問い合わせ増加企業（recent > prev） ===")
increasing = df_cmp[df_cmp['recent'] > df_cmp['prev']]
print(f"増加中: {len(increasing)}社 / {len(df_cmp)}社")
print(increasing.to_string(index=False))
```

取得した数値を次のステップに引き継いでください。

---

## Step 2: 仮説生成

以下のシステムプロンプトに従い、Step 1 の数値を根拠として仮説を3つ生成してください。

> あなたはカスタマーサポートデータの分析専門家です。
> 与えられたトピックの問い合わせ群を横断的に分析し、「なぜこのトピックの問い合わせが増えているか」の仮説を3つ生成してください。
> 各仮説には必ず根拠となるデータの傾向を添えること。**相関と因果を混同しないこと。**

各仮説を以下の形式で整理してください：

```
仮説1: [タイトル]
根拠データ: [Step1の具体的な数値]
想定メカニズム: [相関として記述、因果でないことを明示]

仮説2: ...
仮説3: ...
```

---

## Step 3: 仮説検証（Agent tool で3並列実行）

**必ず Agent tool を使い、仮説1・仮説2・仮説3 を3つのサブエージェントで並列実行してください。**
各サブエージェントには以下のプロンプトテンプレートを使用します。

### サブエージェント共通プロンプトテンプレート

```
あなたはデータ分析の批判的レビュアーです。
以下の仮説を検証してください。

仮説: {hypothesis}
DB: claude-code-inquiry-analyzer/data/cs_poc.db
トピック: {topic}

以下を必ず実施してください:
1. python -c "..." で検証コードを実行して数値を示す
   （Bash の python -c は承認なしで実行できる）
2. service_changes テーブルの変更日前後で件数変化を確認する（必須）
3. 判定: 支持 / 棄却 / 保留（不確実）を明示する
4. 結果をJSON形式で返す:
   {"verdict": "支持|棄却|保留", "evidence": "根拠の文章", "data": {"key": "value"}}

注意: 相関関係と因果関係を区別すること。不確実な場合は「不確実」と明示すること。
```

3つのサブエージェントの結果 JSON を収集し、Step 4 に渡してください。

---

## Step 4: レポート統合（Agent tool でレポート作成エージェントを実行）

**必ず Agent tool を使い、レポート作成エージェントを実行してください。**

### レポート作成エージェントへの指示

```
あなたはCSマネージャーへの提言を作成する専門家です。
3つの仮説検証結果を統合し、reports/{job_id}/report.html を生成してください。

【入力データ】
- トピック: {topic}
- Step1 EDA結果: {eda_summary}
- 仮説1検証結果: {verdict_1}
- 仮説2検証結果: {verdict_2}
- 仮説3検証結果: {verdict_3}

【レポートの構成】
1. エグゼクティブサマリー（3行以内）
2. データ概要（件数・期間・主要KPI）
3. 仮説検証結果（支持/棄却/保留+根拠）
4. 解約リスク評価（下記の決定木を適用、企業別リスト）
5. 推奨アクション（ロジックツリー、優先度P1/P2/P3付き）

【解約リスク決定木】
annual + days_to_renewal <= 90 + utilization < 0.50 → 🔴高
annual + days_to_renewal <= 90 + 問い合わせ増加中       → 🟡中
monthly + utilization < 0.30 + 問い合わせ増加中         → 🔴高
monthly + utilization < 0.30                            → 🟡中
その他                                                  → 🟢低

【デザイン要件】
- ティール（#0d9488）×白の日本語ビジネステンプレート
- Meiryo UI または游ゴシック フォント
- monthly の問い合わせは annual より解約リスクを高く扱う
- 不確実な事項は「不確実」と明示する
- レスポンシブ対応（max-width: 960px）

【出力ファイル】
- claude-code-inquiry-analyzer/reports/{job_id}/report.html（HTMLレポート本体）
- claude-code-inquiry-analyzer/reports/{job_id}/analysis.py（再実行可能な分析コード）

analysis.py の要件:
- DB接続から全クエリ・サブカテゴリ分類・リスク判定まですべて含める
- `python analysis.py` 単体で再実行して同じ結果が得られること
- sys.stdout.reconfigure(encoding='utf-8') を冒頭に入れること
```

---

## Step 5: 完了報告

レポート生成後、以下を出力してください：

```
✅ 分析完了
トピック  : {topic}
Job ID    : {job_id}
レポートURL: http://localhost:3000/reports/{job_id}/report.html

【サマリー】
- 過去28日件数: {N}件
- escalated率 : {X}%
- 仮説1: {verdict_1}（支持/棄却/保留）
- 仮説2: {verdict_2}（支持/棄却/保留）
- 仮説3: {verdict_3}（支持/棄却/保留）
- 🔴高リスク企業: {N}社
- 🟡中リスク企業: {N}社
```

PLAN.md の該当タスクを `- [x]` に更新してください。

---

## 分析方針（厳守）

- **傾向を掴む → 対策が必要かを判断する**
- **変化点を検知する → service_changes と必ず照合する**
- **相関と因果を混同しない**（「増えた」と「なぜ増えたか」は別）
- 結論には必ず根拠データをセットで出す
- 不確実なものは「不確実」と明示する
- Step 3 の仮説検証は必ず Agent tool による3並列実行
- Step 4 のレポート作成は必ず Agent tool による実行

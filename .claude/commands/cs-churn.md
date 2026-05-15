---
description: 解約リスク企業の週次分析を実行する。MLスコアリング → 上位企業の深掘り → レポート出力の3ステップで動作する。
---

# 解約リスク分析エージェント — `/cs-churn`

`/cs-churn` または「解約リスクを分析して」と指示されたとき、以下の3ステップを順番に実行してください。

`job_id` を `job_` + ランダム8桁hex（例: `job_b5e21a7c`）で生成し、`claude-code-inquiry-analyzer/reports/{job_id}/` ディレクトリを作成してください。

---

## Step 1: MLスコアリング実行

**⚠️ 承認不要なコマンド形式（settings.json で設定済み）**

以下の形式で実行してください。承認は **一切求めません**：

✅ 【Bash / Linux / Mac】
```bash
cd claude-code-inquiry-analyzer && python data/churn_weekly.py
```

✅ 【PowerShell / Windows】
```powershell
cd "claude-code-inquiry-analyzer"
python "data/churn_weekly.py"
```

❌ 避ける形式（承認が求められます）:
- `python << 'EOF'...EOF`（ここまで読み込み）
- `cat script.py | python`（パイプ）
- `sh -c "python ..."`（sh ラッピング）

出力から以下を記録してください：

- 🔴高リスク企業リスト（churn_prob, util_t0, util_slope_3m, days_to_renewal）
- 🟡中リスク企業リスト
- モデルの特徴量重要度トップ3

---

## Step 2: 高リスク企業の深掘り分析

**⚠️ サブエージェント内でのコマンド実行ルール**

以下の形式を **必ず** 使用させてください（承認不要）:

✅ 【Bash】
```bash
cd claude-code-inquiry-analyzer && python -c "import sqlite3; ..."
```

✅ 【PowerShell】
```powershell
cd "claude-code-inquiry-analyzer"
python -c "import sqlite3; ..."
```

❌ 避けるべき:
```bash
python << 'EOF'
...
EOF
```

**必ず Agent tool を使い、🔴高リスク企業ごとにサブエージェントで並列実行してください。**
（高リスク企業が5社以上の場合は上位5社に絞る）

### サブエージェント共通プロンプトテンプレート

```
あなたは解約リスク分析の専門家です。
以下の企業の解約リスクを深掘りしてください。

対象企業: {company_id} / {company_name}
DB: claude-code-inquiry-analyzer/data/cs_poc.db

【コマンド実行ルール】
必ず以下の形式で実行してください（承認は求めません）:

✅ 【Bash】
cd claude-code-inquiry-analyzer && python -c "..."

✅ 【PowerShell】
cd "claude-code-inquiry-analyzer"; python -c "..."

⚠️ 絶対に避けること:
- python << 'EOF'...EOF
- cat file.py | python

以下をすべて上記の形式で実行して数値を示してください:

1. 利用率の推移（直近6ヶ月）
```python
import sqlite3, pandas as pd, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('claude-code-inquiry-analyzer/data/cs_poc.db')
print(pd.read_sql("""
    SELECT year_month, active_users, licenses, utilization_rate
    FROM usage
    WHERE company_id = '{company_id}'
    ORDER BY year_month DESC LIMIT 6
""", conn).to_string(index=False))
```

2. 直近90日の問い合わせ履歴（トピック・優先度・満足度）
```python
print(pd.read_sql("""
    SELECT date, topic_ai, priority, status, escalated, satisfaction_score
    FROM inquiries
    WHERE company_id = '{company_id}' AND date >= date('now', '-90 days')
    ORDER BY date DESC
""", conn).to_string(index=False))
```

3. 契約情報と解約リスク判定
```python
print(pd.read_sql("""
    SELECT billing_type, plan, renewal_date,
           CAST(julianday(renewal_date) - julianday('now') AS INTEGER) AS days_to_renewal
    FROM contracts WHERE company_id = '{company_id}'
""", conn).to_string(index=False))
```

4. service_changes と利用率変化の照合
```python
sc = pd.read_sql("SELECT * FROM service_changes ORDER BY date", conn)
print(sc.to_string(index=False))
conn.close()
```

分析後、以下の形式でJSONを返してください:
{
  "company_id": "{company_id}",
  "churn_prob": {churn_prob},
  "risk_reason": "利用率・問い合わせパターン・更新日から見た主なリスク要因（2文以内）",
  "urgency": "即対応必要 | 今週中に確認 | 様子見",
  "recommended_action": "具体的なCSアクション（例: CSオーナーから利用状況ヒアリング、デモ再実施など）",
  "service_change_related": true または false,
  "uncertainty": "不確実な点があれば記載、なければ null"
}
```

サブエージェントの結果 JSON を全社分収集し、Step 3 に渡してください。

---

## Step 3: レポート生成

**必ず Agent tool を使い、レポート作成エージェントを実行してください。**

### レポート作成エージェントへの指示

```
あなたはCSマネージャーへの解約リスクサマリーを作成する専門家です。
以下のデータを統合し、reports/{job_id}/report.html を生成してください。

【入力データ】
- 基準日: {today}
- MLモデル特徴量重要度: {feature_importance_top3}
- 高リスク企業分析結果: {company_analyses}（JSON配列）

【レポート構成】
1. エグゼクティブサマリー（今週のリスク概況、3行以内）
2. リスク分布（🔴高 / 🟡中 / 🟢低 の社数と割合）
3. 🔴高リスク企業 詳細テーブル
   - 企業名 / チャーン確率 / 主なリスク要因 / 緊急度 / 推奨アクション
4. モデル根拠（特徴量重要度の簡易説明）
5. 今週のアクションリスト（緊急度順、優先度P1/P2/P3付き）

【デザイン要件】
- ティール（#0d9488）×白の日本語ビジネステンプレート
- Meiryo UI または游ゴシック フォント
- レスポンシブ対応（max-width: 960px）
- 不確実な事項は「不確実」と明示する
- 代理ラベル（利用率急落）を使用している旨を脚注に記載

【出力ファイル】
- claude-code-inquiry-analyzer/reports/{job_id}/report.html
- claude-code-inquiry-analyzer/reports/{job_id}/analysis.py（churn_weekly.py を参照した再実行可能コード）

analysis.py の要件:
- `python analysis.py` 単体で同じスコアリングが再現できること
- sys.stdout.reconfigure(encoding='utf-8') を冒頭に入れること
```

---

## Step 4: 完了報告

```
✅ 解約リスク分析完了
基準日   : {today}
Job ID   : {job_id}
レポートURL: http://localhost:3000/reports/{job_id}/report.html

【今週のリスクサマリー】
🔴高リスク: {N}社
🟡中リスク: {N}社
🟢低リスク: {N}社

【即対応必要な企業】
- {company_name}（チャーン確率{prob}%）: {recommended_action}
- ...

【モデル精度メモ】
- 代理ラベル: 利用率25%以上の月次急落 → churn=1
- CV AUC: Logistic Regression {auc_lr} / Random Forest {auc_rf}
- ⚠️ 実際の解約フラグで再学習すると精度が向上します
```

---

## 分析方針（厳守）

- **代理ラベルの限界を必ず明示する**（「利用率急落 ≠ 解約」）
- 結論には必ず根拠データ（数値）をセットで出す
- 不確実なものは「不確実」と明示する
- Step 2 の企業深掘りは必ず Agent tool による並列実行
- Step 3 のレポート作成は必ず Agent tool による実行

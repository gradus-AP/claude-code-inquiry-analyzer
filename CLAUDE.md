# CS分析エージェント PoC

## このプロジェクトについて

カスタマーサポートの問い合わせデータから解約リスクの予兆を検知するAI分析エージェントのPoC。
**Claude Code がエージェント本体**。FastAPI + React はモニタリングダッシュボード用。

## アーキテクチャ

```
[Human] → 「このトピック分析して」
[Claude Code] → SQLite を直接読む → Python EDA 実行 → HTML レポート生成 → URL提示
[React :3000] ← ダッシュボード（常時表示）
[FastAPI :8000] ← ダッシュボード用 API のみ
```

## ディレクトリ構成

```
cs-agent-poc/
├── CLAUDE.md           ← このファイル
├── PLAN.md             ← 実装進捗（完了したタスクは [x] にする）
├── backend/
│   ├── main.py
│   ├── db.py
│   └── routers/        # summary / topics / inquiries / risk / analysis
├── frontend/src/
│   └── components/     # KPIRow / TrendChart / ABCTable / InquiryTable / RiskList / AnalysisModal
├── data/
│   ├── cs_poc.db       # SQLite（seed.py で生成）
│   └── seed.py         # cs_poc_data.xlsx → SQLite
├── reports/            # 分析レポート出力先
│   └── {job_id}/
│       ├── report.html
│       └── analysis.py  # 再実行可能な生成コード
└── evals/
    └── eval_questions.md
```

## データ構造

### contracts（50社）
| カラム | 型 | 説明 |
|--------|-----|------|
| company_id | str | 主キー（C001〜C050） |
| billing_type | str | monthly / annual（リスク判定に使用） |
| plan | str | Starter / Pro / Enterprise |
| renewal_date | date | 更新日 |
| cs_owner | str | CS担当者名 |

### inquiries（1,000件）
| カラム | 型 | 説明 |
|--------|-----|------|
| inquiry_id | str | 主キー |
| company_id | str | contracts と結合 |
| date | date | 問い合わせ日 |
| description | str | 本文（topic_ai 付与の入力） |
| topic_ai | str | AIが付与したトピック（8カテゴリ） |
| priority | str | 高 / 中 / 低 |
| status | str | 解決済み / 対応中 / エスカレーション |
| escalated | int | 0 / 1 |
| satisfaction_score | float | 1〜5（解決済みのみ） |

### usage（50社 × 24ヶ月）
| カラム | 型 | 説明 |
|--------|-----|------|
| company_id | str | contracts と結合 |
| year_month | str | YYYY-MM |
| active_users | int | 当月ログインユーザー数 |
| licenses | int | 契約ライセンス数 |
| utilization_rate | float | active_users / licenses |

### service_changes（6件）
| カラム | 説明 |
|--------|------|
| date | 変更日（変化点検知に使用） |
| category | 変更カテゴリ |
| description | 変更内容 |

## topic_ai の8カテゴリ

問い合わせ本文から以下のいずれかを付与する:
1. ログインできない
2. 機能の使い方
3. データエクスポート
4. API連携
5. 請求・支払い
6. 権限設定
7. パフォーマンス低下
8. 解約手続き

## 解約リスク決定木

```
billing_type == annual?
├── Yes → days_to_renewal <= 28?
│         ├── Yes → utilization_rate < 0.50? → 🔴高 / 問い合わせ増加中? → 🟡中 / 🟢低
│         └── No  → 🟢低
└── No（monthly） → utilization_rate < 0.30?
          ├── Yes → 問い合わせ増加中? → 🔴高 / 🟡中
          └── No  → 🟢低
```
※ 閾値（28日・50%・30%）は初回実測後に調整

## 分析フロー（Claude Code が実行）

「{トピック名} を分析して」と言われたら以下を実行:

### Step 1: データ取得 + EDA

```python
import sqlite3, pandas as pd
conn = sqlite3.connect('data/cs_poc.db')

# 直近90日（トレンド把握用）
df_90 = pd.read_sql("""
  SELECT i.*, c.billing_type, c.plan, c.renewal_date,
         CAST(julianday(c.renewal_date) - julianday('now') AS INTEGER) AS days_to_renewal,
         u.utilization_rate
  FROM inquiries i
  JOIN contracts c ON i.company_id = c.company_id
  LEFT JOIN (
    SELECT company_id, utilization_rate
    FROM usage
    WHERE year_month = (SELECT MAX(year_month) FROM usage)
  ) u ON i.company_id = u.company_id
  WHERE i.topic_ai = '{topic}'
  AND i.date >= date('now', '-90 days')
""", conn)

# 直近28日（集中分析用）
df_28 = df_90[df_90['date'] >= (pd.Timestamp.today() - pd.Timedelta(days=28)).strftime('%Y-%m-%d')]

# サービス変更ログ（変化点検知用）
df_changes = pd.read_sql("SELECT * FROM service_changes ORDER BY date", conn)
conn.close()

# EDA
print(f"90日件数: {len(df_90)}, 28日件数: {len(df_28)}")
print(df_28.groupby('priority').size())
print(df_28.groupby('status').size())
print(df_28.groupby('billing_type').size())
print(df_28['satisfaction_score'].describe())
print(df_28.groupby('company_id').size().sort_values(ascending=False).head(10))
# 週次トレンド
df_90['week'] = pd.to_datetime(df_90['date']).dt.to_period('W')
print(df_90.groupby('week').size())
```

### Step 2: 仮説生成（仮説Agent）

以下のEDA結果を踏まえ、仮説を3つ生成する:
- 件数推移（週次）を見て「増加・横ばい・減少」を判定する
- 優先度・ステータス・billing_type の分布から傾向を読む
- 満足度スコアの低い問い合わせに共通点がないか確認する
- service_changes の日付と件数の変化点を照合する

各仮説は必ず「データ上の根拠 → 推測される原因」の形式で書く。
相関と因果を混同しない。根拠がない推測は「不確実」と明示する。

### Step 3: 仮説検証（検証Agent × 3、並列実行）

各仮説を独立して検証する。以下を必ず実施:
1. 仮説を支持・棄却するデータを Python で抽出して数値を示す
2. service_changes テーブルの変更日前後で件数が変化しているか確認する
3. 高リスク企業（annual + days_to_renewal<=90 + utilization_rate<0.50）に
   このトピックの問い合わせが集中していないか確認する
4. 判定: 支持 / 棄却 / 保留（不確実）のいずれかを明示する

### Step 4: レポート生成（レポートAgent）

検証結果を統合して HTML レポートを生成する。構成:
1. **エグゼクティブサマリー**（3行以内）
2. **データ概要**（件数・期間・主要指標）
3. **仮説検証結果**（支持/棄却/保留 + 根拠データ）
4. **解約リスクへの影響**（annual/monthly 別の緊急度）
5. **推奨アクション**（ロジックツリー形式、優先度付き）
6. **不確実な点**（追加調査が必要な事項）

monthly の問い合わせは即解約に直結しうるため annual より緊急度を高く扱うこと。

### Step 5: 出力

- `reports/{job_id}/` ディレクトリを作成する
- `reports/{job_id}/report.html` にレポートを保存（スタンドアロン HTML）
- `reports/{job_id}/analysis.py` に生成コードを保存（再実行可能にする）
- 完了後に `http://localhost:3000/report/{job_id}` を提示する

## 分析方針（厳守）

- 傾向を掴む → 対策が必要かを判断する
- 変化点を検知する → service_changes と必ず照合する
- **相関と因果を混同しない**（「増えた」と「なぜ増えたか」は別）
- 結論には必ず根拠データをセットで出す
- 不確実なものは「不確実」と明示する

## 進捗管理

タスクが完了したら **PLAN.md の該当行を `- [x]`** に更新すること。

## 起動コマンド

```bash
# バックエンド
cd backend && uvicorn main:app --reload --port 8000

# フロントエンド
cd frontend && npm run dev   # → localhost:3000

# シードデータ生成
cd data && python seed.py
```

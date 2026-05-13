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
├── Yes → days_to_renewal <= 90?
│         ├── Yes → utilization_rate < 0.50? → 🔴高 / 問い合わせ増加中? → 🟡中 / 🟢低
│         └── No  → 🟢低
└── No（monthly） → utilization_rate < 0.30?
          ├── Yes → 問い合わせ増加中? → 🔴高 / 🟡中
          └── No  → 🟢低
```
※ 閾値（90日・50%・30%）は初回実測後に調整

## 分析フロー（Claude Code が実行）

「{トピック名} を分析して」と言われたら以下を実行:

### Step 1: データ取得
```python
import sqlite3, pandas as pd
conn = sqlite3.connect('data/cs_poc.db')
df = pd.read_sql("""
  SELECT i.*, c.billing_type, c.plan, c.renewal_date,
         u.utilization_rate
  FROM inquiries i
  JOIN contracts c ON i.company_id = c.company_id
  LEFT JOIN (
    SELECT company_id, utilization_rate
    FROM usage
    WHERE year_month = (SELECT MAX(year_month) FROM usage)
  ) u ON i.company_id = u.company_id
  WHERE i.topic_ai = '{topic}'
  AND i.date >= date('now', '-28 days')
""", conn)
```

### Step 2: 仮説生成（仮説Agent）
あなたはカスタマーサポートデータの分析専門家です。
与えられたトピックの問い合わせ群を横断的に分析し、「なぜこのトピックの問い合わせが増えているか」の仮説を3つ生成してください。
各仮説には必ず根拠となるデータの傾向を添えること。相関と因果を混同しないこと。

### Step 3: 仮説検証（検証Agent × 3、並列実行）
あなたはデータ分析の批判的レビュアーです。
与えられた仮説をEDAで検証し、支持・棄却・保留のいずれかを判定してください。
service_changes テーブルの変化点（サービス変更日）との関連を必ず確認すること。不確実な場合は「不確実」と明示すること。

### Step 4: レポート生成（レポートAgent）
あなたはCSマネージャーへの提言を作成する専門家です。
検証済みの仮説を統合し、対策が必要かどうかの判断と推奨アクションをロジックツリー形式で出力してください。
monthly / annual の緊急度の違いを考慮すること。

### Step 5: 出力
- `reports/{job_id}/report.html` にレポートを保存
- `reports/{job_id}/analysis.py` に生成コードを保存（再実行可能にする）
- 完了後に `http://localhost:3001/report/{job_id}` を提示

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

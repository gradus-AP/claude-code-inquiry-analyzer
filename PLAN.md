---
updated: 2026-05-13
---

# CS分析エージェント PoC — 実装プラン

## アーキテクチャ概要

```
[Human]
  ↓ 「このトピック分析して」と指示
[Claude Code CLI]  ← エージェント本体
  ↓ ローカル SQLite を直接 Python で読む
  ↓ EDA → 仮説×3 → 検証×3（並列）→ レポート生成
  ↓ /reports/{job_id}.html を出力 → localhost リンクを提示

[React Dashboard :3000]  ← モニタリング（常時表示）
  ↕ REST API
[FastAPI :8000 + SQLite]  ← ダッシュボード表示専用
```

---

## TODO

### Phase 0: 環境準備 + データ前処理（05/13 午前）

- [x] CLAUDE.md 作成（アーキテクチャ・データ仕様・Agentプロンプト・起動コマンド）
- [x] `.claude/settings.json` 設定（Stop hook + 読み取り専用コマンド許可）
- [x] `/cs-data-prep` スキル作成（xlsx→SQLite変換 + topic_ai 8カテゴリ分類）
- [x] GitHub リポジトリ作成・ディレクトリ構成作成
- [x] `/cs-data-prep` 実行（SQLite生成 + topic_ai 付与）

### Phase 1: FastAPI バックエンド（05/13 午後）

- [x] `GET /api/summary`（KPI集計）
- [x] `GET /api/topics/trend`（日別集計 + ABC分析ランク付け）
- [x] `GET /api/inquiries`（topic / priority / status / days フィルタ）
- [x] `GET /api/risk/companies`（解約リスク決定木ロジック）
- [x] `POST /api/analysis/start` + `GET /api/analysis/{job_id}`（ジョブ管理）

### Phase 2: React フロントエンド（05/14 午前）

- [ ] `KPIRow` コンポーネント（問い合わせ総数・対応中・エスカレーション・満足度・高リスク企業数）
- [ ] `TrendChart` コンポーネント（Chart.js 積み上げ棒グラフ）
- [ ] `ABCTable` コンポーネント（トピック別 ABC ランク）
- [ ] `InquiryTable` コンポーネント（フィルタ UI 付き）
- [ ] `RiskList` + `ServiceChangeLog` コンポーネント
- [ ] `AnalysisModal`（4ステップ進捗表示）
- [ ] 期間ボタン（7 / 14 / 28 / 90 日）

### Phase 3: 分析フロー整備（05/14 午後）

- [ ] CLAUDE.md の分析手順を詳細化（プロンプト調整）
- [ ] テスト実行：「ログインできないトピックを分析して」
- [ ] レポート HTML の出力確認・テンプレート調整

### Phase 4: 評価・実測値取得（05/15）

- [ ] `evals/eval_questions.md` に標準質問10問を定義
- [ ] Claude Code で評価実行・結果記録
- [ ] 正答率・分析品質・レビュー工数を PoC 計画書に転記

---

## 懸念事項

### ① topic_ai 付与の品質
- **内容**: 問い合わせ本文から8カテゴリへの分類精度が低いと、以降の分析がすべてブレる
- **対策**: 付与後にサンプル20件を目視確認。カテゴリ定義を CLAUDE.md に明示する

### ② 解約リスク決定木の閾値
- **内容**: 年払い90日・利用率50%/30% の閾値は仮置き。実データで妥当性が不明
- **対策**: Phase 4 の実測後に調整。初回は「閾値は仮」と明示して出力する

### ③ 分析結果の再現性
- **内容**: Claude Code が生成する Python コードは毎回異なる可能性がある
- **対策**: 生成コードを `/reports/{job_id}/analysis.py` として保存し、再実行可能にする

### ④ モーダルとジョブ状態の同期
- **内容**: React モーダルの進捗ステップと実際の分析進捗がずれる
- **対策**: PoC では `GET /api/analysis/{job_id}` のポーリング（3秒間隔）で status を確認し、`done` になったらリンクを表示する簡易実装で割り切る

### ⑤ 期間別データの品質
- **内容**: データ期間が 2024-01 〜 2025-05 の約16ヶ月。90日ビューは問題ないが、28日推移グラフの最新日付をシード時に調整が必要
- **対策**: seed.py でデータを今日基準にオフセット処理する

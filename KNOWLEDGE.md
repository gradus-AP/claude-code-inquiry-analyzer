# CS分析エージェント ナレッジベース

このドキュメントは実装・運用・失敗から得た知見をまとめたものです。
CLAUDE.md（仕様）とは分けて管理し、「なぜそうなっているか」を記録します。

---

## 1. アーキテクチャ設計原則

### Claude Code がエージェント本体である

```
[Human] → 「ログインできないを分析して」
    ↓
[Claude Code] ← エージェント本体
    ├── SQLite を直接読む（FastAPI を経由しない）
    ├── Python EDA を実行する
    ├── サブエージェントを並列起動して仮説検証する
    └── HTMLレポートを生成してパスを提示する

[FastAPI :8000] ← ダッシュボード用API のみ（エージェントは使わない）
[React :3000]  ← 常時表示のモニタリング画面（エージェントは使わない）
```

**なぜFastAPIを経由しないか:**
APIを経由すると「取得→返却→受け取り」のラウンドトリップが発生し、Claudeのコンテキストに入るデータ量が増える。SQLiteを直接読む方がシンプルで速く、EDAコードも柔軟に書ける。

---

## 2. マルチエージェント設計

### 正しいフロー（並列を活かす）

```
Step1: EDA取得        ← Claude が直接実行（Bash/Python）
Step2: 仮説生成       ← Claude が直接考える（Step1依存）
                              ↓ 仮説A・B・C が確定してから
Step3: 仮説検証 ×3   ← Agent tool で並列起動（互いに独立）
        ├── 検証エージェントA（仮説A担当）
        ├── 検証エージェントB（仮説B担当）
        └── 検証エージェントC（仮説C担当）
                              ↓ 3つの結果が揃ってから
Step4: レポート作成   ← Agent tool で起動（Step3依存）
Step5: URL提示        ← Claude が出力
```

### なぜStep3を並列にするか

- 3つの仮説は互いに独立して検証できる
- 直列だと約3倍の時間がかかる
- 各検証エージェントは「仮説テキスト + DBパス + 検証指示」だけ渡せば自律動作できる

### Agent tool の呼び出しタイミング

| タイミング | 理由 |
|-----------|------|
| Step1→2 は順次 | Step2はStep1のEDA数値が必要 |
| Step2→3 は並列起動 | 仮説が確定した時点で3つ同時に起動する |
| Step3→4 は順次 | レポートエージェントは3つの検証結果すべてが必要 |

---

## 3. 推奨設定（settings.json）

### プロジェクト設定（`.claude/settings.json`）

```json
{
  "permissions": {
    "allow": [
      "Bash(pip list*)",
      "Bash(pip show *)",
      "Bash(pip freeze*)",
      "Bash(npm list*)",
      "Bash(python -c *)",
      "Bash(python *.py)",
      "Bash(python data/*.py)"
    ]
  }
}
```

**承認なしにする基準:**
- 読み取り・集計・表示 → 承認なし
- ファイル書き込み（レポート生成） → 承認あり（デフォルト）
- DBへの書き込み → 承認あり（デフォルト）

**現在の制限:**
`python -c *` はコード内容を見ていないため、DML文も承認なしで通る。
PoC環境では seed.py で再生成できるため許容しているが、本番化時は要見直し。

### Stop フック（PLAN.md 更新リマインダー）

```json
"hooks": {
  "Stop": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "powershell -Command \"...\""
    }]
  }]
}
```

タスク完了後に PLAN.md の `- [ ]` を `- [x]` に更新し忘れるのを防ぐ。

---

## 4. Skill設計 ベストプラクティス

### description に必ず書くこと

```yaml
---
description: >
  いつ使うか（「XXXを分析して」と言われたとき）。
  何をするか（5ステップで解約リスク分析）。
---
```

説明がないと Claude がいつ発動すべきか判断できない。

### パスは絶対的な基点を明示する

```python
# 悪い例（CWDが不明）
DB = 'data/cs_poc.db'

# 良い例（プロジェクトルートからの相対パスを明記）
DB = 'claude-code-inquiry-analyzer/data/cs_poc.db'
```

Claude Code の CWD は `202605-ai-分析エージェント/` なので、
`claude-code-inquiry-analyzer/` を必ずプレフィックスとして含める。

### サブエージェントへの指示に含める必須要素

1. **仮説テキスト**（何を検証するか）
2. **DBパス**（フルパスで渡す）
3. **トピック名**（SQLのWHERE句に使う）
4. **Bashが使えることの明示**（`python -c` は承認なしで実行できる）
5. **出力フォーマット**（JSON形式を指定すると集計しやすい）

### レポート保存先のパス

```
# 正しいパス（バックエンドのStaticFilesマウント先に合わせる）
claude-code-inquiry-analyzer/reports/{job_id}/report.html
claude-code-inquiry-analyzer/reports/{job_id}/analysis.py

# 間違いやすいパス（ダッシュボードに表示されない）
reports/{job_id}/report.html
```

### job_id の命名規則

```python
import uuid
job_id = 'job_' + uuid.uuid4().hex[:8]  # 例: job_a3f2c891
```

日時ベース（`topic_20260514_123456`）より衝突リスクが低く、既存ジョブとも一致する。

---

## 5. 分析品質 ベストプラクティス

### service_changes との照合は必須

問い合わせ件数の変化点を見つけたとき、必ず `service_changes` テーブルの変更日と照合する。
照合せずに「原因はXだ」と断言するのは NG。

```python
# service_changes との相関を定量化する例
before = df_trend[df_trend['ym'] < sc_date]['cnt'].mean()
after  = df_trend[df_trend['ym'] >= sc_date]['cnt'].mean()
print(f"SC前平均: {before:.1f}件/月, SC後平均: {after:.1f}件/月")
```

### 問い合わせ「増加中」の判定

直近1件だけ見て「増加中」と言わない。90日比較を使う。

```python
# 正しい増加判定
df_cmp = pd.read_sql("""
  SELECT company_id,
    SUM(CASE WHEN date >= date('now','-90 days') THEN 1 ELSE 0 END) AS recent,
    SUM(CASE WHEN date >= date('now','-180 days')
             AND date < date('now','-90 days') THEN 1 ELSE 0 END) AS prev
  FROM inquiries WHERE topic_ai = ?
  GROUP BY company_id
""", conn, params=[topic])
increasing = df_cmp[df_cmp['recent'] > df_cmp['prev']]
```

### utilization_rate は点ではなくトレンドで見る

最新月だけで「利用率が低い」と判断しない。直近6ヶ月のトレンドを確認する。

```python
# 利用率トレンド確認
df_util = pd.read_sql("""
  SELECT year_month, utilization_rate FROM usage
  WHERE company_id = ? ORDER BY year_month DESC LIMIT 6
""", conn, params=[company_id])
trend = '低下' if df_util.iloc[0]['utilization_rate'] < df_util.iloc[-1]['utilization_rate'] else '上昇'
```

### 不確実性の明示ルール

| 状況 | 表現 |
|------|------|
| データが支持しているが因果不明 | 「相関あり（因果は不確実）」 |
| サンプルが少なすぎる（n<5） | 「サンプル数不足のため保留」 |
| service_changesと時期が重なるが他要因もある | 「変化点との相関は認められるが単独要因とは断定できない」 |

---

## 6. アンチパターン

### ❌ 検証を全部自分で順次実行する

```
# やってしまったこと（初回の機能の使い方分析）
Step1: Bash実行 → Step2: 考える → Step3: Bash実行 → Step4: HTMLを直接書く

# あるべき姿
Step3: Agent tool で3並列 → Step4: Agent tool でレポート作成
```

Agent tool を使わずに順次実行すると、設計の意図（並列化・役割分離）が失われる。

### ❌ ポート番号をハードコードして確認しない

```
# やってしまったこと
http://localhost:3001/report/{job_id}  ← フロントエンドは3000

# 確認方法
vite.config.js の server.port を見る
```

### ❌ reports/ の保存先をCWDから決める

```python
# やってしまったこと（CWDが202605-ai-分析エージェントのとき）
'reports/job_xxx/report.html'
# → 202605-ai-分析エージェント/reports/ に保存される
# → バックエンドがマウントしている claude-code-inquiry-analyzer/reports/ と違う

# 正しい
'claude-code-inquiry-analyzer/reports/job_xxx/report.html'
```

### ❌ トピック分類を信頼しすぎる

「機能の使い方」に分類された問い合わせの22%は「パフォーマンス低下」相当の内容だった。
topic_ai の分類結果を鵜呑みにせず、本文のキーワードで二次分類することを推奨。

```python
# サブカテゴリ二次分類の例
def classify(desc):
    if any(k in desc for k in ['レスポンス', 'ローディング', '遅', '時間がかかる']):
        return 'パフォーマンス（誤分類の可能性）'
    elif any(k in desc for k in ['使い方', '方法', 'わかりません', '操作']):
        return '操作方法不明'
    ...
```

### ❌ 承認なし設定をコマンド単位でかける（内容制限なし）

```json
// やってしまったこと
"Bash(python -c *)"  // → DML文も通る

// 本来やるべきこと（本番化時）
// read-only ラッパースクリプトを作って、そのスクリプトだけ許可する
"Bash(python data/query.py *)"
```

### ❌ descriptionにトリガー条件を書かない

```yaml
# 悪い例（いつ使うか不明）
description: CS問い合わせの分析を実行する

# 良い例
description: 「XXXを分析して」と言われたときに使う。CS問い合わせトピックの解約リスク分析を実行する。
```

---

## 7. ファイル・ポート対応表（混乱しやすいもの）

| 項目 | 値 | 備考 |
|------|-----|------|
| フロントエンドポート | **3000** | vite.config.js で定義 |
| バックエンドポート | **8000** | uvicorn デフォルト |
| レポートURL | `http://localhost:3000/report/{job_id}` | Viteプロキシ経由で8000に転送 |
| DBパス（CWD基点） | `claude-code-inquiry-analyzer/data/cs_poc.db` | CWD = `202605-ai-分析エージェント/` |
| レポート保存先 | `claude-code-inquiry-analyzer/reports/{job_id}/` | StaticFilesマウント先 |
| skills保存先 | `.claude/commands/cs-analyze.md` | プロジェクト内スラッシュコマンド |

---

## 8. 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-05-14 | 初版作成。機能の使い方分析（job_caf446a5）の経験をもとに整理 |

#!/bin/bash
# CS分析エージェント PoC — ローカル環境セットアップ (Mac/Linux)
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[ OK ]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "======================================"
echo "  CS分析エージェント PoC セットアップ"
echo "======================================"
echo ""

# ── 1. Python venv ──────────────────────────────────────────
info "Python 仮想環境を作成します..."
python3 -m venv .venv || error "python3 が見つかりません。Python 3.10 以上をインストールしてください。"
source .venv/bin/activate
ok "仮想環境: .venv"

# ── 2. pip install ──────────────────────────────────────────
info "Python パッケージをインストールします..."
pip install --quiet --upgrade pip
pip install --quiet -r backend/requirements.txt
ok "pip install 完了"

# ── 3. npm install ──────────────────────────────────────────
info "Node.js パッケージをインストールします..."
command -v node >/dev/null 2>&1 || error "Node.js が見つかりません。Node.js 18 以上をインストールしてください。"
cd frontend && npm install --silent && cd ..
ok "npm install 完了"

# ── 4. SQLite 生成 ──────────────────────────────────────────
info "サンプルデータを確認します..."
XLSX="data/cs_poc_data.xlsx"
DB="data/cs_poc.db"

if [ ! -f "$XLSX" ]; then
    echo ""
    echo -e "${RED}[WARN]${NC} $XLSX が見つかりません。"
    echo "       data/ フォルダに cs_poc_data.xlsx を配置してから"
    echo "       以下を実行してください:"
    echo ""
    echo "         source .venv/bin/activate"
    echo "         python data/seed.py"
    echo ""
else
    info "SQLite データベースを生成します..."
    python data/seed.py
    ok "データベース生成完了: $DB"
fi

# ── 完了 ────────────────────────────────────────────────────
echo ""
echo "======================================"
echo -e "  ${GREEN}セットアップ完了！${NC}"
echo "======================================"
echo ""
echo "起動コマンド:"
echo ""
echo "  # バックエンド（ターミナル 1）"
echo "  source .venv/bin/activate"
echo "  uvicorn backend.main:app --reload --port 8000"
echo ""
echo "  # フロントエンド（ターミナル 2）"
echo "  cd frontend && npm run dev"
echo ""
echo "  ブラウザ: http://localhost:3000"
echo ""

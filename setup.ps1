# CS分析エージェント PoC — ローカル環境セットアップ (Windows PowerShell)
# 実行方法: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"

function info  { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function ok    { Write-Host "[ OK ] $args" -ForegroundColor Green }
function warn  { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function fatal { Write-Host "[ERROR] $args" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  CS分析エージェント PoC セットアップ" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Python venv ──────────────────────────────────────────
info "Python 仮想環境を作成します..."
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    fatal "python が見つかりません。Python 3.10 以上をインストールしてください。"
}
python -m venv .venv
& .\.venv\Scripts\Activate.ps1
ok "仮想環境: .venv"

# ── 2. pip install ──────────────────────────────────────────
info "Python パッケージをインストールします..."
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r backend/requirements.txt
ok "pip install 完了"

# ── 3. npm install ──────────────────────────────────────────
info "Node.js パッケージをインストールします..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    fatal "Node.js が見つかりません。Node.js 18 以上をインストールしてください。"
}
Push-Location frontend
npm install --silent
Pop-Location
ok "npm install 完了"

# ── 4. SQLite 生成 ──────────────────────────────────────────
info "サンプルデータを確認します..."
$xlsx = "data\cs_poc_data.xlsx"
$db   = "data\cs_poc.db"

if (-not (Test-Path $xlsx)) {
    Write-Host ""
    warn "$xlsx が見つかりません。"
    Write-Host "       data\ フォルダに cs_poc_data.xlsx を配置してから" -ForegroundColor Yellow
    Write-Host "       以下を実行してください:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "         .\.venv\Scripts\Activate.ps1" -ForegroundColor White
    Write-Host "         python data\seed.py" -ForegroundColor White
    Write-Host ""
} else {
    info "SQLite データベースを生成します..."
    python data\seed.py
    ok "データベース生成完了: $db"
}

# ── 完了 ────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  セットアップ完了！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "起動コマンド:" -ForegroundColor White
Write-Host ""
Write-Host "  # バックエンド（ターミナル 1）" -ForegroundColor Gray
Write-Host "  .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  uvicorn backend.main:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "  # フロントエンド（ターミナル 2）" -ForegroundColor Gray
Write-Host "  cd frontend; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  ブラウザ: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

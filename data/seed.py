"""
cs_poc_data.xlsx → data/cs_poc.db (SQLite) 変換 + topic_ai 分類
"""
import sqlite3, sys, os
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_XLSX = "data/cs_poc_data.xlsx"
DEFAULT_DB   = "data/cs_poc.db"

TOPIC_RULES = [
    ("解約手続き",        ["解約", "退会", "解除", "キャンセル"]),
    ("ログインできない",   ["ログイン", "サインイン", "認証", "パスワード", "SSO", "二段階認証"]),
    ("データエクスポート", ["エクスポート", "CSV", "ダウンロード", "列の順番", "列"]),
    ("API連携",           ["API", "v1", "v2", "移行", "エンドポイント"]),
    ("請求・支払い",      ["請求", "支払", "料金", "プラン変更", "インボイス"]),
    ("権限設定",          ["権限", "管理者", "移譲", "ロール", "アクセス権"]),
    ("パフォーマンス低下", ["遅い", "重い", "重く", "パフォーマンス", "読み込み", "速度", "タイムアウト", "時間がかかる", "支障"]),
    ("機能の使い方",      []),
]
CATEGORIES = [r[0] for r in TOPIC_RULES]

def classify(description):
    text = str(description)
    for category, keywords in TOPIC_RULES:
        if not keywords:
            return category
        if any(kw in text for kw in keywords):
            return category
    return "機能の使い方"

def main():
    xlsx_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    db_path   = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_DB

    if not os.path.exists(xlsx_path):
        print(f"[ERROR] ファイルが見つかりません: {xlsx_path}")
        sys.exit(1)

    print(f"[READ] {xlsx_path}")
    sheets = pd.read_excel(xlsx_path, sheet_name=None)

    # 日付オフセット: 最新inquiry日 → 今日に揃える
    inq_dates = pd.to_datetime(sheets["inquiries"]["date"])
    offset = pd.Timestamp.today().normalize() - inq_dates.max()
    print(f"[OFFSET] {offset.days}日 シフト（最新データを今日基準に）")

    for col in ["date"]:
        sheets["inquiries"][col] = (pd.to_datetime(sheets["inquiries"][col]) + offset).dt.strftime("%Y-%m-%d")
    for col in ["contract_start", "contract_end", "renewal_date"]:
        sheets["contracts"][col] = (pd.to_datetime(sheets["contracts"][col]) + offset).dt.strftime("%Y-%m-%d")
    for col in ["date"]:
        sheets["service_changes"][col] = (pd.to_datetime(sheets["service_changes"][col]) + offset).dt.strftime("%Y-%m-%d")
    sheets["usage"]["year_month"] = (
        pd.to_datetime(sheets["usage"]["year_month"] + "-01") + offset
    ).dt.strftime("%Y-%m")

    # utilization_rate を active_users / licenses から計算
    usage = sheets["usage"].copy()
    usage["utilization_rate"] = (usage["active_users"] / usage["licenses"]).round(4)
    sheets["usage"] = usage

    inq = sheets["inquiries"].copy()
    mask = inq["topic_ai"].astype(str).str.contains("Claude Codeが付与", na=False)
    inq.loc[mask, "topic_ai"] = inq.loc[mask, "description"].apply(classify)
    sheets["inquiries"] = inq

    conn = sqlite3.connect(db_path)
    for name, df in sheets.items():
        df.to_sql(name, conn, if_exists="replace", index=False)
    conn.commit()
    conn.close()

    print(f"\n[DONE] → {db_path}")
    for name, df in sheets.items():
        print(f"  {name:<20} {len(df):>4} 件")

    print("\n[TOPICS]")
    dist = inq["topic_ai"].value_counts()
    for cat in CATEGORIES:
        print(f"  {cat:<20} {dist.get(cat, 0):>4} 件")

    unclassified = inq[~inq["topic_ai"].isin(CATEGORIES)]
    print(f"\n{'[WARN] 未分類: ' + str(len(unclassified)) + ' 件' if len(unclassified) else '[OK] 未分類: 0 件'}")

if __name__ == "__main__":
    main()

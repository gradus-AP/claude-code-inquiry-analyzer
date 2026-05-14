from fastapi import APIRouter
from backend.db import get_conn

router = APIRouter()


@router.get("/api/risk/companies")
def get_risk_companies():
    conn = get_conn()
    rows = conn.execute("""
        SELECT
            c.company_id,
            c.company_name,
            c.billing_type,
            c.renewal_date,
            CAST(julianday(c.renewal_date) - julianday('now') AS INTEGER) AS days_to_renewal,
            ROUND(u.utilization_rate, 2) AS utilization_rate,
            COALESCE(iq.cnt, 0) AS inquiry_count_28d,
            COALESCE(iq.esc, 0) AS escalated_28d
        FROM contracts c
        JOIN (
            SELECT company_id, utilization_rate
            FROM usage
            WHERE year_month = (SELECT MAX(year_month) FROM usage)
        ) u ON c.company_id = u.company_id
        LEFT JOIN (
            SELECT company_id,
                   COUNT(*) as cnt,
                   SUM(escalated) as esc
            FROM inquiries
            WHERE date >= date('now', '-28 days')
            GROUP BY company_id
        ) iq ON c.company_id = iq.company_id
        ORDER BY c.company_id
    """).fetchall()
    conn.close()

    result = []
    for r in rows:
        r = dict(r)
        r["risk_score"], r["risk_reason"] = _score(r)
        result.append(r)

    result.sort(key=lambda x: {"高": 0, "中": 1, "低": 2}[x["risk_score"]])
    return {"companies": result}


def _score(r: dict) -> tuple[str, str]:
    util = r["utilization_rate"] or 0
    days = r["days_to_renewal"] if r["days_to_renewal"] is not None else 9999
    inq_up = r["inquiry_count_28d"] > 3

    if r["billing_type"] == "annual":
        if 0 <= days <= 28:
            if util < 0.50:
                return "高", f"年払い・更新{days}日以内・利用率{util:.0%}"
            elif inq_up:
                return "中", f"年払い・更新{days}日以内・問い合わせ急増"
            else:
                return "低", f"年払い・更新{days}日以内・利用率良好"
        return "低", "年払い・更新まで余裕あり"
    else:  # monthly
        if util < 0.30:
            if inq_up:
                return "高", f"月払い・利用率{util:.0%}・問い合わせ急増"
            return "中", f"月払い・利用率{util:.0%}"
        return "低", f"月払い・利用率{util:.0%}"

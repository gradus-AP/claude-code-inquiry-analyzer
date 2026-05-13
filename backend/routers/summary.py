from fastapi import APIRouter
from backend.db import get_conn

router = APIRouter()


@router.get("/api/summary")
def get_summary():
    conn = get_conn()
    cur = conn.cursor()

    total = cur.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0]
    open_ = cur.execute("SELECT COUNT(*) FROM inquiries WHERE status != '解決済み'").fetchone()[0]
    escalated = cur.execute("SELECT COUNT(*) FROM inquiries WHERE escalated = 1").fetchone()[0]
    avg_sat = cur.execute(
        "SELECT ROUND(AVG(satisfaction_score), 1) FROM inquiries WHERE satisfaction_score IS NOT NULL"
    ).fetchone()[0]

    # 高リスク企業数（決定木ロジック）
    high_risk = cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT c.company_id
            FROM contracts c
            JOIN (
                SELECT company_id, utilization_rate
                FROM usage
                WHERE year_month = (SELECT MAX(year_month) FROM usage)
            ) u ON c.company_id = u.company_id
            LEFT JOIN (
                SELECT company_id, COUNT(*) as cnt
                FROM inquiries
                WHERE date >= date('now', '-28 days')
                GROUP BY company_id
            ) iq ON c.company_id = iq.company_id
            WHERE (
                c.billing_type = 'annual'
                AND julianday(c.renewal_date) - julianday('now') <= 90
                AND COALESCE(u.utilization_rate, 0) < 0.50
            ) OR (
                c.billing_type = 'monthly'
                AND COALESCE(u.utilization_rate, 0) < 0.30
                AND COALESCE(iq.cnt, 0) > 0
            )
        )
    """).fetchone()[0]

    conn.close()
    return {
        "total_inquiries": total,
        "open_inquiries": open_,
        "escalated": escalated,
        "avg_satisfaction": avg_sat,
        "high_risk_companies": high_risk,
    }

from fastapi import APIRouter, Query
from typing import Optional
from db import get_conn
from datetime import date, timedelta

router = APIRouter()


@router.get("/api/inquiries")
def get_inquiries(
    topic: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    days: int = Query(28, ge=1, le=365),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    conn = get_conn()
    if start and end:
        range_start, range_end = start, end
    else:
        range_start = (date.today() - timedelta(days=days - 1)).isoformat()
        range_end = date.today().isoformat()

    conditions = ["i.date >= ?", "i.date <= ?"]
    params: list = [range_start, range_end]

    if topic:
        conditions.append("i.topic_ai = ?")
        params.append(topic)
    if priority:
        conditions.append("i.priority = ?")
        params.append(priority)
    if status:
        conditions.append("i.status = ?")
        params.append(status)

    where = " AND ".join(conditions)
    rows = conn.execute(f"""
        SELECT i.inquiry_id, i.company_id, c.company_name,
               i.date, i.topic_ai, i.description, i.priority,
               i.status, i.days_to_resolve, i.satisfaction_score
        FROM inquiries i
        JOIN contracts c ON i.company_id = c.company_id
        WHERE {where}
        ORDER BY i.date DESC
    """, params).fetchall()

    conn.close()
    return {
        "items": [dict(r) for r in rows],
        "total": len(rows),
    }

from fastapi import APIRouter
from db import get_conn

router = APIRouter()


@router.get("/api/service_changes")
def get_service_changes():
    conn = get_conn()
    rows = conn.execute(
        "SELECT date, category, description FROM service_changes ORDER BY date DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

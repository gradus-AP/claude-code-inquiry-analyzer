from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import get_conn
import uuid, datetime

router = APIRouter()


class AnalysisRequest(BaseModel):
    topic: str
    days: int = 28


@router.post("/api/analysis/start")
def start_analysis(req: AnalysisRequest):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analysis_jobs (
            job_id TEXT PRIMARY KEY,
            topic TEXT,
            days INTEGER,
            status TEXT,
            result_url TEXT,
            created_at TEXT
        )
    """)
    conn.execute(
        "INSERT INTO analysis_jobs VALUES (?, ?, ?, 'pending', NULL, ?)",
        (job_id, req.topic, req.days, datetime.datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return {
        "job_id": job_id,
        "status": "pending",
        "message": f"分析ジョブを作成しました。Claude Code に「{req.topic} を分析して (job_id: {job_id})」と指示してください。",
    }


@router.get("/api/analysis/{job_id}")
def get_analysis(job_id: str):
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM analysis_jobs WHERE job_id = ?", (job_id,)
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="job not found")

    return dict(row)


@router.patch("/api/analysis/{job_id}")
def update_analysis(job_id: str, status: str, result_url: str | None = None):
    """Claude Code が分析完了後に呼び出すエンドポイント"""
    conn = get_conn()
    conn.execute(
        "UPDATE analysis_jobs SET status = ?, result_url = ? WHERE job_id = ?",
        (status, result_url, job_id),
    )
    conn.commit()
    conn.close()
    return {"job_id": job_id, "status": status}

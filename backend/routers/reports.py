from fastapi import APIRouter
from pathlib import Path
import re

router = APIRouter()

REPORTS_DIR = Path(__file__).parent.parent.parent / "reports"


@router.get("/api/reports")
def list_reports():
    if not REPORTS_DIR.exists():
        return []

    result = []
    for job_dir in sorted(REPORTS_DIR.iterdir(), reverse=True):
        html = job_dir / "report.html"
        if not job_dir.is_dir() or not html.exists():
            continue

        topic = _extract_topic(html)
        stat = html.stat()
        result.append({
            "job_id": job_dir.name,
            "topic": topic,
            "created_at": stat.st_mtime,
            "url": f"/reports/{job_dir.name}/report.html",
        })

    return result


def _extract_topic(html_path: Path) -> str:
    try:
        text = html_path.read_text(encoding="utf-8")
        m = re.search(r"「(.+?)」", text)
        return m.group(1) if m else html_path.parent.name
    except Exception:
        return html_path.parent.name

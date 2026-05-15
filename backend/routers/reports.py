from fastapi import APIRouter, Query
from pathlib import Path
import re
from typing import Optional

router = APIRouter()

REPORTS_DIR = Path(__file__).parent.parent.parent / "reports"
PAGE_SIZE = 10


@router.get("/api/reports")
def list_reports(page: int = Query(1, ge=1), limit: Optional[int] = Query(PAGE_SIZE)):
    """レポート一覧を created_at 降順で返す（ページネーション対応）"""
    if not REPORTS_DIR.exists():
        return {"reports": [], "total": 0, "page": page, "total_pages": 0}

    items = []
    for job_dir in REPORTS_DIR.iterdir():
        html = job_dir / "report.html"
        if not job_dir.is_dir() or not html.exists():
            continue

        text = _read_html(html)
        stat = html.stat()
        items.append({
            "job_id": job_dir.name,
            "topic": _extract_topic(text, html.parent.name),
            "period": _extract_period(text),
            "summary": _extract_section(text, [
                "エグゼクティブサマリー", "サマリー", "サマリー KPI",
            ], 120),
            "actions": _extract_section(text, [
                "推奨アクション", "推奨アクション（優先度順）",
                "推奨アクション（CSマネージャー向け）", "対策判断 ロジックツリー",
            ], 120),
            "created_at": stat.st_mtime,
            "url": f"/reports/{job_dir.name}/report.html",
        })

    # created_at で降順ソート（新しい順）
    items.sort(key=lambda x: x["created_at"], reverse=True)

    # ページネーション
    total = len(items)
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated = items[start_idx:end_idx]

    return {
        "reports": paginated,
        "total": total,
        "page": page,
        "total_pages": total_pages,
    }


def _read_html(html_path: Path) -> str:
    try:
        return html_path.read_text(encoding="utf-8")
    except Exception:
        return ""


def _extract_topic(text: str, fallback: str) -> str:
    # <title> や <h1> の中の「トピック名」を優先して取得
    for pattern in [r"<title>[^<]*「(.+?)」", r"<h1[^>]*>[^<]*「(.+?)」"]:
        m = re.search(pattern, text)
        if m:
            return m.group(1)
    # フォールバック: 最初の「」
    m = re.search(r"「(.+?)」", text)
    return m.group(1) if m else fallback


def _extract_period(text: str) -> str:
    m = re.search(r"対象期間[：:]\s*([^\s<|｜]+)", text)
    return m.group(1) if m else "—"


def _extract_section(text: str, headings: list[str], max_chars: int) -> str:
    """見出し直後のブロックテキストを抽出し max_chars 文字に切る。
    3種のテンプレートに対応:
      - 新: <h2>見出し</h2>
      - 旧1: <div class="section-title">見出し</div>
      - 旧2: <div class="summary-box"><strong>見出し</strong>...
    次セクションの区切りは h1/h2 のみ（h3-h6 はセクション内に含める）。
    """
    NEXT_H12 = r'(?=<h[12][^0-9]|<div[^>]*class="section-title|\Z)'
    for heading in headings:
        patterns = [
            # 新テンプレート: <h2>見出し</h2>
            rf"<h[123456][^>]*>\s*{re.escape(heading)}\s*</h[123456]>\s*(.*?){NEXT_H12}",
            # 旧テンプレート1: <div class="section-title">[任意のタグ]見出し</div>
            rf'<div[^>]*class="section-title[^"]*"[^>]*>(?:<[^>]+>)*[^<]*{re.escape(heading)}.*?</div>\s*(.*?){NEXT_H12}',
            # 旧テンプレート2: <div class="summary-box"><strong>見出し</strong>... テキスト
            rf'<div[^>]*class="summary-box[^"]*"[^>]*>\s*<strong>\s*{re.escape(heading)}\s*</strong>.*?<br\s*/?>\s*(.*?)</div>',
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if m:
                raw = m.group(1)
                clean = re.sub(r"<[^>]+>", "", raw)        # タグ除去
                clean = re.sub(r"\s+", " ", clean).strip()  # 空白正規化
                if clean:
                    return clean[:max_chars] + ("…" if len(clean) > max_chars else "")
    return "—"

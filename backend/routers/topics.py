from fastapi import APIRouter, Query
from typing import Optional
from backend.db import get_conn
from datetime import date, timedelta

router = APIRouter()

TOPICS = [
    "ログインできない", "機能の使い方", "データエクスポート", "API連携",
    "請求・支払い", "権限設定", "パフォーマンス低下", "解約手続き",
]


@router.get("/api/topics/trend")
def get_topics_trend(
    days: int = Query(28, ge=7, le=365),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    conn = get_conn()
    cur = conn.cursor()

    today = date.today()
    if start and end:
        start_d    = date.fromisoformat(start)
        end_d      = date.fromisoformat(end)
        days       = (end_d - start_d).days + 1
    else:
        start_d = today - timedelta(days=days - 1)
        end_d   = today

    start      = start_d.isoformat()
    prev_start = (start_d - timedelta(days=days)).isoformat()
    prev_end   = (start_d - timedelta(days=1)).isoformat()

    # 当期: 日別×トピック集計
    rows = cur.execute("""
        SELECT topic_ai, date, COUNT(*) as count
        FROM inquiries
        WHERE date >= ? AND date <= ?
        GROUP BY topic_ai, date
        ORDER BY topic_ai, date
    """, (start, end_d.isoformat())).fetchall()

    # 前期: トピック別合計のみ
    prev_rows = cur.execute("""
        SELECT topic_ai, COUNT(*) as count
        FROM inquiries
        WHERE date >= ? AND date <= ?
        GROUP BY topic_ai
    """, (prev_start, prev_end)).fetchall()
    prev_totals: dict[str, int] = {t: 0 for t in TOPICS}
    for row in prev_rows:
        if row["topic_ai"] in prev_totals:
            prev_totals[row["topic_ai"]] = row["count"]

    # 日付リスト生成
    date_range = [(start_d + timedelta(days=i)).isoformat() for i in range(days)]

    # トピック別集計
    daily_map: dict[str, dict[str, int]] = {t: {} for t in TOPICS}
    totals: dict[str, int] = {t: 0 for t in TOPICS}
    for row in rows:
        topic = row["topic_ai"]
        if topic in daily_map:
            daily_map[topic][row["date"]] = row["count"]
            totals[topic] += row["count"]

    # ABC分析
    sorted_topics = sorted(TOPICS, key=lambda t: totals[t], reverse=True)
    grand_total = sum(totals.values()) or 1
    cumulative = 0
    abc_rank: dict[str, str] = {}
    for t in sorted_topics:
        cumulative += totals[t]
        ratio = cumulative / grand_total
        abc_rank[t] = "A" if ratio <= 0.70 else ("B" if ratio <= 0.90 else "C")

    result = []
    for t in sorted_topics:
        result.append({
            "topic": t,
            "rank": abc_rank[t],
            "total": totals[t],
            "prev_total": prev_totals[t],
            "daily": [{"date": d, "count": daily_map[t].get(d, 0)} for d in date_range],
        })

    conn.close()
    return {"topics": result}

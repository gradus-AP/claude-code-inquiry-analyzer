from fastapi import APIRouter, Query
from backend.db import get_conn
from datetime import date, timedelta

router = APIRouter()

TOPICS = [
    "ログインできない", "機能の使い方", "データエクスポート", "API連携",
    "請求・支払い", "権限設定", "パフォーマンス低下", "解約手続き",
]


@router.get("/api/topics/trend")
def get_topics_trend(days: int = Query(28, ge=7, le=90)):
    conn = get_conn()
    cur = conn.cursor()

    start = (date.today() - timedelta(days=days - 1)).isoformat()

    # 日別×トピック集計
    rows = cur.execute("""
        SELECT topic_ai, date, COUNT(*) as count
        FROM inquiries
        WHERE date >= ?
        GROUP BY topic_ai, date
        ORDER BY topic_ai, date
    """, (start,)).fetchall()

    # 日付リスト生成
    date_range = [(date.today() - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]

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
            "daily": [{"date": d, "count": daily_map[t].get(d, 0)} for d in date_range],
        })

    conn.close()
    return {"topics": result}

export default function TopicPieChart({ topics }) {
  if (!topics?.length) return <p style={{ color: '#9ca3af' }}>データなし</p>

  const total = topics.reduce((sum, t) => sum + t.total, 0)
  if (total === 0) return <p style={{ color: '#9ca3af' }}>件数がありません</p>

  const colors = ['#0d9488', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6']

  // 円グラフのパイスライスを描画
  let currentAngle = -90 // 12時位置から開始
  const slices = topics.map((t, i) => {
    const percentage = (t.total / total) * 100
    const angle = (percentage / 100) * 360
    const isLargeArc = angle > 180 ? 1 : 0

    const x1 = 50 + 45 * Math.cos((currentAngle * Math.PI) / 180)
    const y1 = 50 + 45 * Math.sin((currentAngle * Math.PI) / 180)
    const x2 = 50 + 45 * Math.cos(((currentAngle + angle) * Math.PI) / 180)
    const y2 = 50 + 45 * Math.sin(((currentAngle + angle) * Math.PI) / 180)

    const path = `M 50 50 L ${x1} ${y1} A 45 45 0 ${isLargeArc} 1 ${x2} ${y2} Z`
    const color = colors[i % colors.length]

    currentAngle += angle

    return { path, color, topic: t.topic, total: t.total, percentage }
  })

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* 円グラフ */}
      <svg viewBox="0 0 100 100" style={{ width: '200px', height: '200px' }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1" />
        ))}
        {/* 中心の円（ドーナッツ型にする場合） */}
        <circle cx="50" cy="50" r="20" fill="#fff" />
      </svg>

      {/* 凡例（データがある場合のみ表示） */}
      {total > 0 && (
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
            合計: {total}件
          </div>
          {slices.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: s.color, borderRadius: '2px' }} />
              <span style={{ color: '#6b7280' }}>
                {s.topic}: <strong style={{ color: '#374151' }}>{s.total}</strong>件 ({s.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Diff({ current, prev }) {
  if (prev == null) return null
  const diff = current - prev
  if (diff === 0) return <span style={{fontSize:'11px', color:'#9ca3af', marginLeft:'4px'}}>±0</span>
  const up = diff > 0
  return (
    <span style={{fontSize:'11px', marginLeft:'4px', color: up ? '#dc2626' : '#059669', fontWeight:600}}>
      {up ? '▲' : '▼'}{Math.abs(diff)}
    </span>
  )
}

export default function ABCTable({ topics, onAnalyze }) {
  if (!topics?.length) return <p style={{color:'#9ca3af'}}>データなし</p>
  return (
    <table>
      <thead>
        <tr>
          <th>トピック</th>
          <th>件数</th>
          <th>ランク</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {topics.map(t => (
          <tr key={t.topic}>
            <td>{t.topic}</td>
            <td>
              {t.total}
              <Diff current={t.total} prev={t.prev_total} />
            </td>
            <td><span className={`badge badge-${t.rank}`}>{t.rank}</span></td>
            <td>
              <button
                className="btn btn-secondary"
                style={{padding:'3px 10px', fontSize:'12px'}}
                onClick={() => onAnalyze(t.topic)}
              >
                分析
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

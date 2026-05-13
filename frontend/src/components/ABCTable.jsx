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
            <td>{t.total}</td>
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

export default function ServiceChangeLog({ changes }) {
  if (!changes?.length) return <p style={{color:'#9ca3af'}}>データなし</p>
  return (
    <div>
      {changes.map((c, i) => (
        <div key={i} className="change-item">
          <span className="change-date">{c.date}</span>
          <span style={{fontWeight:600,fontSize:'12px',color:'#374151',width:80}}>{c.category}</span>
          <span style={{color:'#6b7280'}}>{c.description}</span>
        </div>
      ))}
    </div>
  )
}

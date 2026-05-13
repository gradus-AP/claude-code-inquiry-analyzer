export default function RiskList({ companies }) {
  if (!companies?.length) return <p style={{color:'#9ca3af'}}>データなし</p>
  return (
    <div>
      {companies.filter(c => c.risk_score !== '低').map(c => (
        <div key={c.company_id} className="risk-item">
          <span className={`risk-badge risk-${c.risk_score}`}>{c.risk_score}</span>
          <div className="risk-info">
            <div className="name">{c.company_name}</div>
            <div className="reason">{c.risk_reason}</div>
          </div>
          <div style={{fontSize:'12px',color:'#6b7280',textAlign:'right'}}>
            <div>利用率 {Math.round((c.utilization_rate ?? 0) * 100)}%</div>
            <div>28d問合: {c.inquiry_count_28d}件</div>
          </div>
        </div>
      ))}
    </div>
  )
}

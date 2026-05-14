import { useState } from 'react'

const PAGE_SIZE = 10

export default function RiskList({ companies }) {
  const [page, setPage] = useState(1)

  if (!companies?.length) return <p style={{color:'#9ca3af'}}>データなし</p>

  const filtered = companies.filter(c => c.risk_score !== '低')
  const total = filtered.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      {paged.map(c => (
        <div key={c.company_id} className="risk-item">
          <span className={`risk-badge risk-${c.risk_score}`}>{c.risk_score}</span>
          <div className="risk-info">
            <div className="name">{c.company_name}</div>
            <div className="reason">{c.risk_reason}</div>
          </div>
          <div style={{fontSize:'12px',color:'#6b7280',textAlign:'right'}}>
            <div>利用率 {Math.round((c.utilization_rate ?? 0) * 100)}%</div>
            <div>28d問合: {c.inquiry_count_28d}件</div>
            {c.renewal_date && c.billing_type === 'annual' && (
              <div style={{color:'#dc2626', fontWeight:600}}>更新 {c.renewal_date}（{c.days_to_renewal}日後）</div>
            )}
          </div>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>‹</button>
          <span className="page-info">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>›</button>
        </div>
      )}
    </div>
  )
}

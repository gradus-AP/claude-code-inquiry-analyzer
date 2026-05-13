export default function KPIRow({ data }) {
  if (!data) return null
  return (
    <div className="kpi-row">
      <div className="kpi-card">
        <div className="label">問い合わせ総数</div>
        <div className="value">{data.total_inquiries}</div>
      </div>
      <div className="kpi-card">
        <div className="label">対応中</div>
        <div className="value warn">{data.open_inquiries}</div>
      </div>
      <div className="kpi-card">
        <div className="label">エスカレーション</div>
        <div className="value danger">{data.escalated}</div>
      </div>
      <div className="kpi-card">
        <div className="label">平均満足度</div>
        <div className="value">{data.avg_satisfaction ?? '—'}</div>
      </div>
      <div className="kpi-card">
        <div className="label">高リスク企業</div>
        <div className="value danger">{data.high_risk_companies}</div>
      </div>
    </div>
  )
}

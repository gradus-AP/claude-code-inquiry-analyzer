import { useState, useEffect } from 'react'

export default function ReportList() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(setReports)
  }, [])

  if (!reports.length) return (
    <div className="card">
      <p style={{color:'#9ca3af',fontSize:'14px'}}>レポートはまだありません。ダッシュボードの「分析」ボタンから生成してください。</p>
    </div>
  )

  return (
    <div className="report-list">
      {reports.map(r => (
        <a key={r.job_id} href={r.url} target="_blank" rel="noreferrer" className="report-card">
          <div className="report-topic">「{r.topic}」分析レポート</div>
          <div className="report-meta">
            <span className="report-job">{r.job_id}</span>
            <span className="report-date">{new Date(r.created_at * 1000).toLocaleString('ja-JP')}</span>
          </div>
          <div className="report-arrow">→</div>
        </a>
      ))}
    </div>
  )
}

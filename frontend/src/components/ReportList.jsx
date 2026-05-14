import { useState, useEffect } from 'react'

export default function ReportList() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(setReports)
  }, [])

  if (!reports.length) return (
    <div className="card">
      <p style={{color:'#9ca3af',fontSize:'14px'}}>レポートはまだありません。「分析」ボタンから生成してください。</p>
    </div>
  )

  return (
    <div className="card" style={{padding:'0'}}>
      <table style={{width:'100%'}}>
        <thead>
          <tr style={{background:'#f9fafb'}}>
            <th style={{padding:'10px 16px',width:'100px'}}>作成日</th>
            <th style={{padding:'10px 16px',width:'140px'}}>トピック</th>
            <th style={{padding:'10px 16px',width:'90px'}}>対象期間</th>
            <th style={{padding:'10px 16px'}}>サマリー</th>
            <th style={{padding:'10px 16px'}}>推奨アクション</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.job_id} style={{borderTop:'1px solid #f3f4f6'}}>
              <td style={{padding:'10px 16px',fontSize:'12px',color:'#6b7280',whiteSpace:'nowrap'}}>
                {new Date(r.created_at * 1000).toLocaleDateString('ja-JP')}
              </td>
              <td style={{padding:'10px 16px'}}>
                <a href={r.url} target="_blank" rel="noreferrer"
                  style={{fontWeight:600,fontSize:'13px',color:'#2563eb',textDecoration:'none'}}>
                  「{r.topic}」
                </a>
              </td>
              <td style={{padding:'10px 16px',fontSize:'12px',color:'#6b7280',whiteSpace:'nowrap'}}>
                {r.period}
              </td>
              <td style={{padding:'10px 16px',fontSize:'12px',color:'#374151',lineHeight:'1.5'}}>
                {r.summary}
              </td>
              <td style={{padding:'10px 16px',fontSize:'12px',color:'#374151',lineHeight:'1.5'}}>
                {r.actions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

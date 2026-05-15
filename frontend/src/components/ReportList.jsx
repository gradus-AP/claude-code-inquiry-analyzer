import { useState, useEffect } from 'react'

export default function ReportList() {
  const [reports, setReports] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    fetch(`/api/reports?page=${page}&limit=${ITEMS_PER_PAGE}`)
      .then(r => r.json())
      .then(data => {
        setReports(data.reports)
        setTotal(data.total)
        setTotalPages(data.total_pages)
      })
  }, [page])

  if (!total) return (
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

      {/* ページネーション */}
      <div style={{
        padding:'12px 16px',
        borderTop:'1px solid #f3f4f6',
        display:'flex',
        justifyContent:'space-between',
        alignItems:'center',
        background:'#fafafa',
        fontSize:'13px',
        color:'#6b7280'
      }}>
        <span>全 {total} 件（ページ {page}/{totalPages}）</span>
        <div style={{display:'flex',gap:'8px'}}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding:'6px 12px',
              border:'1px solid #d1d5db',
              background: page === 1 ? '#f3f4f6' : '#fff',
              color: page === 1 ? '#9ca3af' : '#374151',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              borderRadius:'4px',
              fontSize:'12px',
              fontWeight:500
            }}
          >
            ← 前へ
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding:'6px 12px',
              border:'1px solid #d1d5db',
              background: page === totalPages ? '#f3f4f6' : '#fff',
              color: page === totalPages ? '#9ca3af' : '#374151',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              borderRadius:'4px',
              fontSize:'12px',
              fontWeight:500
            }}
          >
            次へ →
          </button>
        </div>
      </div>
    </div>
  )
}

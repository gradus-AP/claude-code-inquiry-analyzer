import { useState, useEffect } from 'react'

const STEPS = ['データ取得', '仮説生成（仮説Agent）', '仮説検証（検証Agent×3）', 'レポート生成']

export default function AnalysisModal({ topic, days, onClose }) {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState('starting')
  const [resultUrl, setResultUrl] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/analysis/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, days }),
    })
      .then(r => r.json())
      .then(d => {
        setJobId(d.job_id)
        setStatus(d.status)
        setMessage(d.message)
      })
  }, [topic, days])

  useEffect(() => {
    if (!jobId || status === 'done' || status === 'error') return
    const id = setInterval(() => {
      fetch(`/api/analysis/${jobId}`)
        .then(r => r.json())
        .then(d => {
          setStatus(d.status)
          if (d.result_url) setResultUrl(d.result_url)
        })
    }, 3000)
    return () => clearInterval(id)
  }, [jobId, status])

  const stepIndex = status === 'done' ? 4 : status === 'running' ? 2 : status === 'pending' ? 0 : 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>分析ジョブ — {topic}</h3>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'waiting'}`}>
              <span>{i < stepIndex ? '✓' : i === stepIndex ? '⟳' : '○'}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
        {message && <p style={{fontSize:'12px',color:'#6b7280',marginBottom:'12px'}}>{message}</p>}
        {resultUrl && (
          <p style={{marginBottom:'12px'}}>
            <a href={resultUrl} target="_blank" rel="noreferrer" style={{color:'#2563eb'}}>
              レポートを開く →
            </a>
          </p>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  )
}

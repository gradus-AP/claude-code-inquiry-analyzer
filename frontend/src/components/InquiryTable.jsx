import { useState } from 'react'

const TOPICS = ['', '機能の使い方', 'ログインできない', 'データエクスポート', 'API連携', '請求・支払い', '権限設定', 'パフォーマンス低下', '解約手続き']
const PRIORITIES = ['', '高', '中', '低']
const STATUSES = ['', '解決済み', '対応中', 'エスカレーション']
const PAGE_SIZE = 20

export default function InquiryTable({ inquiries }) {
  const [topic, setTopic] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const filtered = (inquiries ?? []).filter(i =>
    (!topic || i.topic_ai === topic) &&
    (!priority || i.priority === priority) &&
    (!status || i.status === status)
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  return (
    <>
      <div className="filters">
        <select value={topic} onChange={handleFilter(setTopic)}>
          {TOPICS.map(t => <option key={t} value={t}>{t || 'トピック（全）'}</option>)}
        </select>
        <select value={priority} onChange={handleFilter(setPriority)}>
          {PRIORITIES.map(p => <option key={p} value={p}>{p || '優先度（全）'}</option>)}
        </select>
        <select value={status} onChange={handleFilter(setStatus)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'ステータス（全）'}</option>)}
        </select>
        <span style={{fontSize:'12px',color:'#9ca3af',alignSelf:'center'}}>{filtered.length}件</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>日付</th>
            <th>企業</th>
            <th>トピック</th>
            <th>優先度</th>
            <th>ステータス</th>
            <th>満足度</th>
          </tr>
        </thead>
        <tbody>
          {paged.map(i => (
            <tr key={i.inquiry_id}>
              <td>{i.date}</td>
              <td>{i.company_name}</td>
              <td>{i.topic_ai}</td>
              <td>{i.priority}</td>
              <td className={`status-${i.status}`}>{i.status}</td>
              <td>{i.satisfaction_score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>‹</button>
          <span className="page-info">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>›</button>
        </div>
      )}
    </>
  )
}

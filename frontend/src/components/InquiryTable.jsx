import { useState } from 'react'

const TOPICS = ['', '機能の使い方', 'ログインできない', 'データエクスポート', 'API連携', '請求・支払い', '権限設定', 'パフォーマンス低下', '解約手続き']
const PRIORITIES = ['', '高', '中', '低']
const STATUSES = ['', '解決済み', '対応中', 'エスカレーション']

export default function InquiryTable({ inquiries }) {
  const [topic, setTopic] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')

  const filtered = (inquiries ?? []).filter(i =>
    (!topic || i.topic_ai === topic) &&
    (!priority || i.priority === priority) &&
    (!status || i.status === status)
  )

  return (
    <>
      <div className="filters">
        <select value={topic} onChange={e => setTopic(e.target.value)}>
          {TOPICS.map(t => <option key={t} value={t}>{t || 'トピック（全）'}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          {PRIORITIES.map(p => <option key={p} value={p}>{p || '優先度（全）'}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'ステータス（全）'}</option>)}
        </select>
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
          {filtered.slice(0, 50).map(i => (
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
      {filtered.length > 50 && <p style={{fontSize:'12px',color:'#9ca3af',marginTop:'6px'}}>他 {filtered.length - 50} 件</p>}
    </>
  )
}

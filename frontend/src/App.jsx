import { useState, useEffect } from 'react'
import KPIRow from './components/KPIRow'
import TrendChart from './components/TrendChart'
import ABCTable from './components/ABCTable'
import InquiryTable from './components/InquiryTable'
import RiskList from './components/RiskList'
import ServiceChangeLog from './components/ServiceChangeLog'
import TopicPieChart from './components/TopicPieChart'
import AnalysisModal from './components/AnalysisModal'
import ReportList from './components/ReportList'

const PERIODS = [7, 14, 28, 90]
const TABS = ['ダッシュボード', '分析']

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}
const TODAY = toDateStr(new Date())

export default function App() {
  const [tab, setTab] = useState(0)
  const [days, setDays] = useState(28)
  const [dateFrom, setDateFrom] = useState(() => toDateStr(new Date(Date.now() - 27 * 86400000)))
  const [dateTo, setDateTo] = useState(TODAY)
  const [summary, setSummary] = useState(null)
  const [topics, setTopics] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [riskCompanies, setRiskCompanies] = useState([])
  const [serviceChanges, setServiceChanges] = useState([])
  const [analysisTopic, setAnalysisTopic] = useState(null)

  const dateParams = `start=${dateFrom}&end=${dateTo}`

  useEffect(() => {
    fetch(`/api/summary?${dateParams}`).then(r => r.json()).then(setSummary)
    fetch(`/api/inquiries?${dateParams}`).then(r => r.json()).then(d => setInquiries(d.items ?? []))
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetch('/api/risk/companies').then(r => r.json()).then(d => setRiskCompanies(d.companies ?? []))
    fetch('/api/service_changes').then(r => r.json()).then(d => setServiceChanges(d ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/topics/trend?${dateParams}`)
      .then(r => r.json())
      .then(d => setTopics(d.topics ?? []))
  }, [dateFrom, dateTo])

  return (
    <div className="dashboard">
      <header>
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
          <h1>CS分析ダッシュボード</h1>
          <div className="tab-btns">
            {TABS.map((t, i) => (
              <button key={t} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <div className="period-btns">
            {PERIODS.map(d => (
              <button key={d} className={days === d && dateTo === TODAY ? 'active' : ''} onClick={() => {
                const from = toDateStr(new Date(Date.now() - (d - 1) * 86400000))
                setDays(d)
                setDateFrom(from)
                setDateTo(TODAY)
              }}>
                {d}日
              </button>
            ))}
          </div>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => {
              setDateFrom(e.target.value)
              setDays(0)
            }}
            style={{padding:'4px 8px', border:'1px solid #d1d5db', borderRadius:'4px', fontSize:'13px', color:'#374151'}}
          />
          <span style={{fontSize:'13px', color:'#6b7280'}}>〜</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={TODAY}
            onChange={e => {
              setDateTo(e.target.value)
              setDays(0)
            }}
            style={{padding:'4px 8px', border:'1px solid #d1d5db', borderRadius:'4px', fontSize:'13px', color:'#374151'}}
          />
        </div>
      </header>

      {tab === 1 ? (
        <>
          <div className="grid-2">
            <div className="card">
              <h2>トピック別 ABC分析</h2>
              <ABCTable topics={topics} onAnalyze={setAnalysisTopic} />
            </div>
            <div className="card">
              <h2>トピック別件数（{days}日）</h2>
              <TopicPieChart topics={topics} />
            </div>
          </div>
          <div className="grid-2">
            <div className="card">
              <h2>サービス変更ログ</h2>
              <ServiceChangeLog changes={serviceChanges} />
            </div>
          </div>
          <div>
            <h2 style={{fontSize:'1rem',color:'#374151',marginBottom:'10px'}}>分析レポート一覧</h2>
            <ReportList />
          </div>
        </>
      ) : (
        <>
          <KPIRow data={summary} days={days} />

          <div className="grid-2">
            <div className="card">
              <h2>問い合わせトレンド（{days}日）</h2>
              <TrendChart topics={topics} />
            </div>
            <div className="card">
              <h2>トピック別件数（{days}日）</h2>
              <TopicPieChart topics={topics} />
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>解約リスク企業</h2>
              <RiskList companies={riskCompanies} />
            </div>
          </div>

          <div className="card">
            <h2>問い合わせ一覧（{days}日）</h2>
            <InquiryTable inquiries={inquiries} />
          </div>
        </>
      )}

      {analysisTopic && (
        <AnalysisModal
          topic={analysisTopic}
          days={days}
          onClose={() => setAnalysisTopic(null)}
        />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import KPIRow from './components/KPIRow'
import TrendChart from './components/TrendChart'
import ABCTable from './components/ABCTable'
import InquiryTable from './components/InquiryTable'
import RiskList from './components/RiskList'
import ServiceChangeLog from './components/ServiceChangeLog'
import AnalysisModal from './components/AnalysisModal'
import ReportList from './components/ReportList'

const PERIODS = [7, 14, 28, 90]
const TABS = ['ダッシュボード', 'レポート一覧']

export default function App() {
  const [tab, setTab] = useState(0)
  const [days, setDays] = useState(28)
  const [summary, setSummary] = useState(null)
  const [topics, setTopics] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [riskCompanies, setRiskCompanies] = useState([])
  const [serviceChanges, setServiceChanges] = useState([])
  const [analysisTopic, setAnalysisTopic] = useState(null)

  useEffect(() => {
    fetch(`/api/summary?days=${days}`).then(r => r.json()).then(setSummary)
    fetch(`/api/inquiries?days=${days}`).then(r => r.json()).then(d => setInquiries(d.items ?? []))
  }, [days])

  useEffect(() => {
    fetch('/api/risk/companies').then(r => r.json()).then(d => setRiskCompanies(d.companies ?? []))
    fetch('/api/service_changes').then(r => r.json()).then(d => setServiceChanges(d ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/topics/trend?days=${days}`)
      .then(r => r.json())
      .then(d => setTopics(d.topics ?? []))
  }, [days])

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
        {tab === 0 && (
          <div className="period-btns">
            {PERIODS.map(d => (
              <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
                {d}日
              </button>
            ))}
          </div>
        )}
      </header>

      {tab === 1 ? (
        <>
          <div style={{padding:'4px 0 8px'}}>
            <h2 style={{fontSize:'1rem', color:'#374151'}}>分析レポート一覧</h2>
          </div>
          <ReportList />
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
              <h2>トピック別 ABC分析</h2>
              <ABCTable topics={topics} onAnalyze={setAnalysisTopic} />
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>解約リスク企業</h2>
              <RiskList companies={riskCompanies} />
            </div>
            <div className="card">
              <h2>サービス変更ログ</h2>
              <ServiceChangeLog changes={serviceChanges} />
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

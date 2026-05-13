import { useState, useEffect } from 'react'
import KPIRow from './components/KPIRow'
import TrendChart from './components/TrendChart'
import ABCTable from './components/ABCTable'
import InquiryTable from './components/InquiryTable'
import RiskList from './components/RiskList'
import ServiceChangeLog from './components/ServiceChangeLog'
import AnalysisModal from './components/AnalysisModal'

const PERIODS = [7, 14, 28, 90]

export default function App() {
  const [days, setDays] = useState(28)
  const [summary, setSummary] = useState(null)
  const [topics, setTopics] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [riskCompanies, setRiskCompanies] = useState([])
  const [serviceChanges, setServiceChanges] = useState([])
  const [analysisTopic, setAnalysisTopic] = useState(null)

  useEffect(() => {
    fetch('/api/summary').then(r => r.json()).then(setSummary)
    fetch('/api/risk/companies').then(r => r.json()).then(d => setRiskCompanies(d.companies ?? []))
    fetch('/api/inquiries?days=90').then(r => r.json()).then(d => setInquiries(d.items ?? []))
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
        <h1>CS分析ダッシュボード</h1>
        <div className="period-btns">
          {PERIODS.map(d => (
            <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
              {d}日
            </button>
          ))}
        </div>
      </header>

      <KPIRow data={summary} />

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
        <h2>問い合わせ一覧</h2>
        <InquiryTable inquiries={inquiries} />
      </div>

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

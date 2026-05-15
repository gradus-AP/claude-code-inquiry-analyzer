import { useState } from 'react'

const DEFAULT_PROMPT = (topic, days = 28) => `「${topic}」を分析して（対象期間: 直近${days}日）`

export default function AnalysisModal({ topic, days = 28, onClose }) {
  const [copied, setCopied] = useState(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT(topic, days))

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: '16px' }}>分析ジョブ — 「{topic}」</h3>

        {/* プロンプト編集・コピー */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <label style={{fontWeight:600,color:'#78350f',fontSize:'12px'}}>📝 プロンプト</label>
            <button
              onClick={handleCopy}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: copied ? '#10b981' : '#fbbf24',
                color: copied ? '#fff' : '#78350f',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              {copied ? '✓ コピー済み' : '📋 コピー'}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              width: '100%',
              height: '100px',
              padding: '8px',
              background: '#fff',
              border: '1px solid #fde68a',
              borderRadius: '3px',
              fontFamily: 'Monaco, monospace',
              fontSize: '12px',
              color: '#374151',
              lineHeight: '1.5',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* メッセージ */}
        <div style={{
          background: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#1e40af',
          lineHeight: '1.6'
        }}>
          ℹ️ <strong>上のプロンプトをコピーして、Claude Code に貼り付けてください。</strong><br/>
          分析が完了したら、Claude Code チャット内にレポートリンクが表示されます。
        </div>

        {/* フロー図 */}
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#374151',
          lineHeight: '1.8'
        }}>
          <div style={{fontWeight:600,marginBottom:'8px'}}>分析フロー</div>
          <div style={{fontSize:'11px'}}>
            1️⃣ EDA データ取得<br/>
            2️⃣ 仮説生成<br/>
            3️⃣ 仮説検証（3並列）<br/>
            4️⃣ レポート生成
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn-secondary" onClick={onClose} style={{background:'#e5e7eb'}}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

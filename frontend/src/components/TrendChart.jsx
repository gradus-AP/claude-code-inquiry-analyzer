import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const COLORS = [
  '#3b82f6','#f59e0b','#10b981','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
]

export default function TrendChart({ topics }) {
  if (!topics?.length) return <p style={{color:'#9ca3af'}}>データなし</p>

  const labels = topics[0].daily.map(d => d.date.slice(5))
  const datasets = topics.map((t, i) => ({
    label: t.topic,
    data: t.daily.map(d => d.count),
    backgroundColor: COLORS[i % COLORS.length],
  }))

  return (
    <Bar
      data={{ labels, datasets }}
      options={{
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { stacked: true, ticks: { font: { size: 10 } } },
          y: { stacked: true, ticks: { stepSize: 1 } },
        },
      }}
    />
  )
}

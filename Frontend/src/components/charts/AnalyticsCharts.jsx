import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
)

const COLORS = {
  primary: '#2563EB',
  secondary: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  indigo: '#6366F1',
}

const defaultOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true } },
    tooltip: { bodyFont: { family: 'Inter' }, titleFont: { family: 'Inter' }, cornerRadius: 8 },
  },
}

export function IncidentsByDistrictChart({ data }) {
  const districts = Object.keys(data || {}).slice(0, 10)
  const counts = districts.map(d => (data || {})[d] || 0)

  const chartData = {
    labels: districts,
    datasets: [{
      label: 'Incidents',
      data: counts,
      backgroundColor: districts.map((_, i) => [COLORS.primary, COLORS.danger, COLORS.warning, COLORS.purple, COLORS.cyan, COLORS.pink][i % 6] + 'CC'),
      borderRadius: 8,
      borderSkipped: false,
    }],
  }

  return (
    <div style={{ height: 260 }}>
      <Bar data={chartData} options={{ ...defaultOpts, plugins: { ...defaultOpts.plugins, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { font: { size: 11 } } } } }} />
    </div>
  )
}

export function DisasterTypeChart({ data }) {
  const types = Object.keys(data || {})
  const counts = types.map(t => (data || {})[t] || 0)
  const bgColors = [COLORS.danger, COLORS.warning, COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.cyan].map(c => c + 'DD')

  const chartData = {
    labels: types,
    datasets: [{ data: counts, backgroundColor: bgColors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
  }

  return (
    <div style={{ height: 260 }}>
      <Pie data={chartData} options={{ ...defaultOpts, plugins: { ...defaultOpts.plugins, legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } } }} />
    </div>
  )
}

export function PriorityChart({ data }) {
  const priorities = ['Critical', 'High', 'Medium', 'Low']
  const counts = priorities.map(p => (data || {})[p] || 0)
  const colors = [COLORS.danger, COLORS.warning, COLORS.primary, COLORS.secondary].map(c => c + 'DD')

  const chartData = {
    labels: priorities,
    datasets: [{ data: counts, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
  }

  return (
    <div style={{ height: 260 }}>
      <Doughnut data={chartData} options={{ ...defaultOpts, cutout: '65%', plugins: { ...defaultOpts.plugins, legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } } }} />
    </div>
  )
}

export function TimelineChart({ data }) {
  const labels = (data || []).map(d => d.date)
  const counts = (data || []).map(d => d.count)

  const chartData = {
    labels,
    datasets: [{
      label: 'Incidents Reported',
      data: counts,
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary + '20',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: COLORS.primary,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  }

  return (
    <div style={{ height: 260 }}>
      <Line data={chartData} options={{ ...defaultOpts, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 10, font: { size: 10 } } } } }} />
    </div>
  )
}

export function ResourceStatusChart({ data }) {
  const chartData = {
    labels: ['Available', 'Assigned', 'Maintenance'],
    datasets: [{
      data: [data?.available || 0, data?.assigned || 0, data?.maintenance || 0],
      backgroundColor: [COLORS.secondary + 'DD', COLORS.primary + 'DD', COLORS.warning + 'DD'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  return (
    <div style={{ height: 220 }}>
      <Doughnut data={chartData} options={{ ...defaultOpts, cutout: '60%', plugins: { ...defaultOpts.plugins, legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } } }} />
    </div>
  )
}

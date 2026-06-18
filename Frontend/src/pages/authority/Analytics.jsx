import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Download, RefreshCw, TrendingUp, Users,
  Package, AlertTriangle, CheckCircle, Heart, Baby, Loader, FileText
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatCard from '../../components/common/StatCard'
import {
  IncidentsByDistrictChart, DisasterTypeChart,
  PriorityChart, TimelineChart, ResourceStatusChart
} from '../../components/charts/AnalyticsCharts'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/analytics/dashboard')
      setData(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const downloadSituationReport = async () => {
    setDownloading(true)
    try {
      const res = await api.get('/reports/situation', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `situation_report_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Situation report downloaded!')
    } catch {
      toast.error('Failed to download report')
    }
    setDownloading(false)
  }

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>

  const ov = data?.overview || {}

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics Dashboard</h1>
            <p className="text-gray-500 text-sm">Real-time disaster response metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="btn-secondary text-sm py-2 px-3"><RefreshCw size={14} /></button>
            <button onClick={downloadSituationReport} disabled={downloading} className="btn-primary text-sm">
              {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
              Situation Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={AlertTriangle} label="Total Incidents" value={ov.total_incidents ?? 0} color="danger" />
          <StatCard icon={CheckCircle} label="Completed Rescues" value={ov.completed_rescues ?? 0} sub={`${ov.people_rescued ?? 0} rescued`} color="success" />
          <StatCard icon={TrendingUp} label="Active Incidents" value={ov.active_incidents ?? 0} sub={`${ov.critical_incidents ?? 0} critical`} color="warning" />
          <StatCard icon={Users} label="Volunteers" value={ov.approved_volunteers ?? 0} sub={`of ${ov.total_volunteers ?? 0} total`} color="primary" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Available Resources" value={ov.available_resources ?? 0} sub={`of ${ov.total_resources ?? 0}`} color="cyan" />
          <StatCard icon={Users} label="Camp Occupancy" value={ov.camp_occupied ?? 0} sub={`/ ${ov.camp_capacity ?? 0} capacity`} color="purple" />
          <StatCard icon={Heart} label="Medical Emergencies" value={data?.medical_emergencies ?? 0} color="danger" />
          <StatCard icon={Baby} label="Children Involved" value={data?.children_involved ?? 0} color="warning" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-600" />
              Incidents by District
            </h2>
            <IncidentsByDistrictChart data={data?.by_district} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-600" />
              Disaster Categories
            </h2>
            <DisasterTypeChart data={data?.by_type} />
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-600" />
              Incident Timeline (Last 30 Days)
            </h2>
            <TimelineChart data={data?.timeline} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              Priority Distribution
            </h2>
            <PriorityChart data={data?.by_priority} />
          </motion.div>
        </div>

        {/* Charts Row 3 */}
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={18} className="text-blue-600" />
              Resource Status
            </h2>
            <ResourceStatusChart data={data?.resource_breakdown} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-5 col-span-2">
            <h2 className="font-bold text-gray-900 mb-4">Incident Status Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(data?.by_status || {}).map(([status, count]) => {
                const total = Object.values(data?.by_status || {}).reduce((a, b) => a + b, 0)
                const pct = total ? Math.round((count / total) * 100) : 0
                const colors = {
                  'Pending': 'bg-gray-400',
                  'Under Review': 'bg-yellow-400',
                  'Rescue Assigned': 'bg-blue-500',
                  'In Progress': 'bg-purple-500',
                  'Completed': 'bg-green-500',
                  'Closed': 'bg-gray-300',
                }
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{status}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${colors[status] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Volunteer Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={18} className="text-green-600" />
            Volunteer Status Breakdown
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Active Volunteers', value: data?.volunteer_breakdown?.active ?? 0, color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Pending Approval', value: data?.volunteer_breakdown?.pending ?? 0, color: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Inactive', value: data?.volunteer_breakdown?.inactive ?? 0, color: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' },
            ].map(({ label, value, color, text, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                <p className={`text-3xl font-extrabold ${text}`}>{value}</p>
                <p className="text-gray-600 text-sm font-medium mt-1">{label}</p>
                <div className={`w-8 h-1.5 ${color} rounded-full mx-auto mt-2`} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

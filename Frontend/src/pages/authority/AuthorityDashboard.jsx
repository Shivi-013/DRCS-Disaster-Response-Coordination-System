import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Users, Package, Tent, BarChart3, Cpu,
  MapPin, RefreshCw, TrendingUp, TrendingDown, Activity,
  CheckCircle, Clock, Flame, Loader, Utensils, Droplets, Sparkles
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatCard from '../../components/common/StatCard'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import IncidentMap from '../../components/map/IncidentMap'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function AuthorityDashboard() {
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [camps, setCamps] = useState([])
  const [aiSummary, setAiSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [restocking, setRestocking] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)

  const handleRestock = async (campId) => {
    setRestocking(campId)
    try {
      const res = await api.patch(`/relief-camps/${campId}/restock`)
      setCamps(prev => prev.map(c => c.id === campId ? { ...c, ...res.data } : c))
      toast.success('Camp restocked! Food: 30 days · Water: 10,000 L · Staff: ≥5')
    } catch {
      toast.error('Restock failed')
    }
    setRestocking(null)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [analyticsRes, incRes, campRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/incidents/', { params: { per_page: 100 } }),
        api.get('/relief-camps/'),
      ])
      setStats(analyticsRes.data)
      setIncidents(incRes.data.items || [])
      setCamps(campRes.data.items || [])
    } catch {}
    setLoading(false)
    // Fetch AI forecast in background after main data loads
    loadForecast()
  }

  const loadForecast = async () => {
    setForecastLoading(true)
    try {
      const res = await api.get('/ai/supply-forecast')
      setForecast(res.data)
    } catch {}
    setForecastLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const generateAiSummary = async () => {
    setAiLoading(true)
    try {
      const res = await api.get('/ai/situation-summary')
      setAiSummary(res.data)
      toast.success('AI summary generated!')
    } catch {
      toast.error('Failed to generate AI summary')
    }
    setAiLoading(false)
  }

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>

  const ov = stats?.overview || {}
  const criticalIncidents = incidents.filter(i => i.priority === 'Critical' && !['Completed', 'Closed'].includes(i.status))

  const supplyAlerts = camps.map(camp => {
    const pct = camp.capacity > 0 ? (camp.occupied / camp.capacity) * 100 : 0
    const issues = []
    if (camp.food_stock_days === 0) issues.push({ level: 'critical', icon: Utensils, text: 'No food stock' })
    else if (camp.food_stock_days <= 2) issues.push({ level: 'warning', icon: Utensils, text: `Food: ${camp.food_stock_days}d left` })
    if (camp.water_stock_liters < 500) issues.push({ level: 'critical', icon: Droplets, text: 'Water critically low' })
    else if (camp.water_stock_liters < 2000) issues.push({ level: 'warning', icon: Droplets, text: `Water: ${camp.water_stock_liters}L` })
    if (pct >= 95) issues.push({ level: 'critical', icon: Users, text: 'At capacity' })
    else if (pct >= 80) issues.push({ level: 'warning', icon: Users, text: `${Math.round(pct)}% full` })
    return { ...camp, issues }
  }).filter(c => c.issues.length > 0).sort((a, b) => b.issues.filter(i => i.level === 'critical').length - a.issues.filter(i => i.level === 'critical').length)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Command Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">State Disaster Management Authority — Live Overview</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="btn-secondary text-sm py-2 px-3">
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link to="/authority/incidents" className="btn-primary text-sm py-2">
              <AlertTriangle size={14} />
              Manage Incidents
            </Link>
          </div>
        </motion.div>

        {/* Critical Alert */}
        {criticalIncidents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-danger-600 text-white rounded-2xl p-4 flex items-center gap-4 priority-critical"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Flame size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold">🚨 {criticalIncidents.length} CRITICAL Incident{criticalIncidents.length > 1 ? 's' : ''} Require Immediate Action</p>
              <p className="text-danger-100 text-sm">{criticalIncidents.slice(0, 2).map(i => `${i.disaster_type} in ${i.district}`).join(' • ')}</p>
            </div>
            <Link to="/authority/incidents?priority=Critical" className="bg-white text-danger-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-danger-50 transition-colors flex-shrink-0">
              View Critical
            </Link>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={AlertTriangle} label="Active Incidents" value={ov.active_incidents ?? 0} sub={`${ov.critical_incidents ?? 0} critical`} color="danger" />
          <StatCard icon={CheckCircle} label="Completed Rescues" value={ov.completed_rescues ?? 0} sub={`${ov.people_rescued ?? 0} people rescued`} color="success" />
          <StatCard icon={Package} label="Available Resources" value={ov.available_resources ?? 0} sub={`of ${ov.total_resources ?? 0} total`} color="primary" />
          <StatCard icon={Users} label="Active Volunteers" value={ov.approved_volunteers ?? 0} sub={`${ov.total_volunteers ?? 0} registered`} color="purple" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Tent} label="Camp Occupancy" value={ov.camp_occupied ?? 0} sub={`of ${ov.camp_capacity ?? 0} capacity`} color="warning" />
          <StatCard icon={Activity} label="People at Risk" value={ov.people_at_risk ?? 0} sub="in active incidents" color="danger" />
          <StatCard icon={TrendingUp} label="Total Incidents" value={ov.total_incidents ?? 0} color="cyan" />
          <StatCard icon={Clock} label="Active Assignments" value={ov.assignments_active ?? 0} sub={`of ${ov.assignments_total ?? 0} total`} color="primary" />
        </div>

        {/* Supply Alerts */}
        {supplyAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                Camp Supply Alerts
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {supplyAlerts.length}
                </span>
              </h2>
              <Link to="/authority/relief-camps" className="text-sm text-primary-600 font-medium hover:text-primary-700">
                Manage Camps
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {supplyAlerts.map(camp => {
                const hasCritical = camp.issues.some(i => i.level === 'critical')
                return (
                  <div key={camp.id} className={`rounded-2xl p-4 border ${hasCritical ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2">
                        <Tent size={15} className={`flex-shrink-0 mt-0.5 ${hasCritical ? 'text-red-500' : 'text-orange-500'}`} />
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{camp.name}</p>
                          <p className="text-xs text-gray-500">{camp.district}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestock(camp.id)}
                        disabled={restocking === camp.id}
                        className="flex-shrink-0 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                      >
                        {restocking === camp.id
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <RefreshCw size={10} />}
                        Restock
                      </button>
                    </div>
                    <div className="space-y-1">
                      {camp.issues.map((issue, idx) => (
                        <div key={idx} className={`flex items-center gap-1.5 text-xs font-semibold ${issue.level === 'critical' ? 'text-red-700' : 'text-orange-700'}`}>
                          <issue.icon size={11} />
                          {issue.text}
                          {issue.level === 'critical' && <span className="ml-auto bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">CRITICAL</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* AI Supply Forecast */}
        {(forecastLoading || forecast) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-purple-500" />
                AI Supply & Capacity Forecast
                {forecastLoading && <span className="text-xs text-purple-400 font-normal animate-pulse ml-1">Analyzing...</span>}
                {forecast && !forecastLoading && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    forecast.overall_risk_level === 'Critical' ? 'bg-red-100 text-red-700' :
                    forecast.overall_risk_level === 'High' ? 'bg-orange-100 text-orange-700' :
                    forecast.overall_risk_level === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{forecast.overall_risk_level} Risk</span>
                )}
              </h2>
              <button onClick={loadForecast} disabled={forecastLoading} className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 disabled:opacity-50">
                <RefreshCw size={11} className={forecastLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {forecastLoading && !forecast ? (
              <div className="space-y-3">
                {[75, 55, 85, 65, 40].map((w, i) => (
                  <div key={i} className="h-3 bg-purple-50 rounded-full animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : forecast && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">{forecast.forecast_summary}</p>

                {forecast.high_risk_camps?.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {forecast.high_risk_camps.map((camp, i) => (
                      <div key={i} className={`rounded-2xl p-4 border ${
                        camp.risk === 'Critical' ? 'border-red-200 bg-red-50' :
                        camp.risk === 'High' ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-sm leading-tight">{camp.name}</p>
                            <p className="text-xs text-gray-500">{camp.district}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            camp.risk === 'Critical' ? 'bg-red-600 text-white' :
                            camp.risk === 'High' ? 'bg-orange-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>{camp.risk}</span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1.5 leading-snug">{camp.predicted_issue}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{camp.predicted_timeframe}</p>
                        <p className="text-[10px] text-purple-600 font-semibold mt-1">→ {camp.recommended_action}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-green-600 font-semibold text-sm">
                    <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                    All camps are within safe parameters for the next 3 days.
                  </div>
                )}

                {forecast.restock_priority?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Restock Priority:</span>
                    {forecast.restock_priority.map((name, i) => (
                      <span key={i} className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-lg">{i + 1}. {name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Live Map */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-primary-600" />
              Live Incident Map
            </h2>
            <div className="flex items-center gap-3 text-xs">
              {[
                { color: 'bg-red-500', label: 'Critical' },
                { color: 'bg-yellow-500', label: 'High' },
                { color: 'bg-blue-500', label: 'Medium' },
                { color: 'bg-green-500', label: 'Low' },
                { color: 'bg-purple-500', label: 'Camps' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <IncidentMap incidents={incidents} camps={camps} height="450px" showCamps={true} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* AI Summary */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Cpu size={18} className="text-purple-600" />
                AI Situation Analysis
              </h2>
              <button
                onClick={generateAiSummary}
                disabled={aiLoading}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                {aiLoading ? <Loader size={14} className="animate-spin" /> : <Cpu size={14} />}
                {aiLoading ? 'Analyzing...' : 'Generate Analysis'}
              </button>
            </div>
            {aiSummary ? (
              <div className="space-y-3">
                <div className={`px-3 py-2 rounded-xl text-sm font-bold ${aiSummary.severity_level === 'Severe' ? 'bg-red-100 text-red-800' : aiSummary.severity_level === 'High' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  Severity: {aiSummary.severity_level}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{aiSummary.overall_situation}</p>
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-1">Top Priorities</p>
                  <ul className="space-y-1">
                    {aiSummary.top_priorities?.map((p, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="w-4 h-4 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-1">Recommended Actions</p>
                  <ul className="space-y-1">
                    {aiSummary.recommended_actions?.map((a, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Cpu size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Click "Generate Analysis" for AI-powered situation assessment</p>
              </div>
            )}
          </div>

          {/* Recent Critical Incidents */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Flame size={18} className="text-red-600" />
                Priority Incidents
              </h2>
              <Link to="/authority/incidents" className="text-sm text-primary-600 font-medium hover:text-primary-700">View all</Link>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {incidents
                .filter(i => !['Completed', 'Closed'].includes(i.status))
                .sort((a, b) => {
                  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
                  return (order[a.priority] ?? 4) - (order[b.priority] ?? 4)
                })
                .slice(0, 8)
                .map((incident, i) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${incident.priority === 'Critical' ? 'bg-red-500' : incident.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{incident.disaster_type}</span>
                        <PriorityBadge priority={incident.priority} />
                      </div>
                      <p className="text-xs text-gray-500">{incident.district} • {incident.people_trapped} trapped</p>
                      {incident.medical_emergency && <span className="text-xs text-red-500 font-semibold">⚕️ Medical Emergency</span>}
                    </div>
                    <StatusBadge status={incident.status} />
                  </motion.div>
                ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="section-title">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { to: '/authority/incidents', icon: AlertTriangle, label: 'Manage Incidents', color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-100' },
              { to: '/authority/resources', icon: Package, label: 'Manage Resources', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100' },
              { to: '/authority/volunteers', icon: Users, label: 'Manage Volunteers', color: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-100' },
              { to: '/authority/analytics', icon: BarChart3, label: 'View Analytics', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link key={label} to={to} className={`flex flex-col items-center gap-3 p-5 rounded-2xl font-semibold text-sm transition-all duration-200 ${color}`}>
                <Icon size={24} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Search, Bell, FileText, MapPin, Clock, AlertTriangle, CheckCircle, Shield } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatCard from '../../components/common/StatCard'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'

export default function CitizenDashboard() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [announcements] = useState([
    { id: 1, title: 'Flood Alert — Darbhanga District', message: 'Water levels rising. Evacuate low-lying areas immediately. Relief camps operational at NH-57.', time: '2 hours ago', type: 'danger' },
    { id: 2, title: 'Rescue Operations Update', message: 'NDRF teams deployed in Muzaffarpur. All critical rescue requests being prioritized.', time: '5 hours ago', type: 'info' },
  ])

  useEffect(() => {
    async function load() {
      try {
        const [incRes, statsRes] = await Promise.all([
          api.get('/incidents/', { params: { per_page: 5 } }),
          api.get('/incidents/stats/summary'),
        ])
        setIncidents(incRes.data.items || [])
        setStats(statsRes.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name?.split(' ')[0]}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Stay safe and report any emergency situation</p>
          </div>
          <Link to="/citizen/report" className="btn-primary">
            <PlusCircle size={18} />
            Report Incident
          </Link>
        </motion.div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map(ann => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-2xl p-4 flex gap-3 ${ann.type === 'danger' ? 'bg-danger-50 border border-danger-200' : 'bg-blue-50 border border-blue-200'}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ann.type === 'danger' ? 'bg-danger-100' : 'bg-blue-100'}`}>
                  <Bell size={16} className={ann.type === 'danger' ? 'text-danger-600' : 'text-blue-600'} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${ann.type === 'danger' ? 'text-danger-800' : 'text-blue-800'}`}>{ann.title}</p>
                  <p className={`text-xs mt-0.5 ${ann.type === 'danger' ? 'text-danger-600' : 'text-blue-600'}`}>{ann.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{ann.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="My Reports" value={stats?.total ?? 0} color="primary" />
          <StatCard icon={Clock} label="Active" value={stats?.active ?? 0} color="warning" />
          <StatCard icon={CheckCircle} label="Completed" value={stats?.completed ?? 0} color="success" />
          <StatCard icon={AlertTriangle} label="Pending" value={stats?.pending ?? 0} color="danger" />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="section-title">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { to: '/citizen/report', icon: PlusCircle, label: 'Report Incident', color: 'bg-primary-600 text-white hover:bg-primary-700' },
              { to: '/citizen/track', icon: Search, label: 'Track Reports', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
              { to: '/citizen/profile', icon: Shield, label: 'My Profile', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
              { to: '/citizen/track', icon: FileText, label: 'Download PDF', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link key={label} to={to} className={`flex flex-col items-center gap-2 p-5 rounded-2xl font-semibold text-sm transition-all duration-200 ${color}`}>
                <Icon size={24} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">My Recent Reports</h2>
            <Link to="/citizen/track" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>

          {incidents.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No incidents reported yet</h3>
              <p className="text-gray-500 text-sm mb-4">In case of any emergency, report it immediately.</p>
              <Link to="/citizen/report" className="btn-primary mx-auto inline-flex">
                <PlusCircle size={16} />
                Report Your First Incident
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident, i) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card p-4 flex items-start gap-4 hover:shadow-md transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    incident.priority === 'Critical' ? 'bg-red-100' :
                    incident.priority === 'High' ? 'bg-orange-100' :
                    incident.priority === 'Medium' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    <AlertTriangle size={18} className={
                      incident.priority === 'Critical' ? 'text-red-600' :
                      incident.priority === 'High' ? 'text-orange-600' :
                      incident.priority === 'Medium' ? 'text-blue-600' : 'text-green-600'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{incident.disaster_type}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} />
                          {incident.village}, {incident.district}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PriorityBadge priority={incident.priority} />
                        <StatusBadge status={incident.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{incident.people_trapped} people trapped</span>
                      {incident.medical_emergency && <span className="text-red-500 font-semibold">⚕️ Medical Emergency</span>}
                      <span>{incident.created_at ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true }) : ''}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Numbers */}
        <div className="bg-gradient-to-r from-danger-50 to-orange-50 border border-danger-100 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Phone size={18} className="text-danger-500" />
            Emergency Helplines
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Disaster Helpline', number: '1077' },
              { label: 'Police Emergency', number: '100' },
              { label: 'Ambulance', number: '108' },
              { label: 'Fire Brigade', number: '101' },
            ].map(({ label, number }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-danger-600">{number}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Phone({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.93 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.88 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

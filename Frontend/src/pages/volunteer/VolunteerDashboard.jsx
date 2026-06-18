import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MapPin, Heart, Clock, CheckCircle, AlertTriangle,
  Shield, Zap, User, Phone, Activity, Globe, Star, X, Flag,
  Sparkles, Package, AlertCircle, ChevronRight
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const skillColors = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700',
]

const availabilityStyle = {
  'Full Time': 'bg-green-100 text-green-700 border-green-200',
  'On Call':   'bg-blue-100 text-blue-700 border-blue-200',
  'Weekends':  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Part Time': 'bg-orange-100 text-orange-700 border-orange-200',
}

export default function VolunteerDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [incident, setIncident] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [citizenContact, setCitizenContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [briefing, setBriefing] = useState(null)
  const [briefingLoading, setBriefingLoading] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const volRes = await api.get('/volunteers/')
      const mine = (volRes.data.items || []).find(v => v.email === user?.email)
      setProfile(mine)

      if (mine?.assigned_incident_id) {
        const [incRes, assignRes] = await Promise.all([
          api.get(`/incidents/${mine.assigned_incident_id}`),
          api.get('/assignments/', { params: { incident_id: mine.assigned_incident_id } }),
        ])
        setIncident(incRes.data)

        const assignments = assignRes.data.items || []
        const latestAssignment = assignments[assignments.length - 1] || null
        setAssignment(latestAssignment)

        // Fetch citizen contact info from incident reporter
        if (incRes.data?.user_id) {
          try {
            const contactRes = await api.get(`/auth/users/${incRes.data.user_id}/contact`)
            setCitizenContact(contactRes.data)
          } catch {}
        }

        // Fetch AI mission briefing if assignment is active
        if (latestAssignment && latestAssignment.status !== 'Completed') {
          setBriefingLoading(true)
          try {
            const briefRes = await api.get(`/ai/mission-briefing/${latestAssignment.id}`)
            setBriefing(briefRes.data)
          } catch {}
          setBriefingLoading(false)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const respondToAssignment = async (action) => {
    if (!assignment) return
    setResponding(true)
    try {
      await api.patch(`/assignments/${assignment.id}/volunteer-response`, { action })
      toast.success(action === 'accept' ? 'Assignment accepted! Head to the location.' : 'Assignment declined.')
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to respond.')
    } finally {
      setResponding(false)
    }
  }

  const markMissionComplete = async () => {
    if (!assignment) return
    setCompleting(true)
    try {
      await api.patch(`/assignments/${assignment.id}/complete`)
      toast.success('Mission marked complete! You can now take on a new incident.')
      setIncident(null)
      setAssignment(null)
      setCitizenContact(null)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to complete mission.')
    } finally {
      setCompleting(false)
    }
  }

  const isPendingAssignment = assignment?.volunteer_status === 'pending' && !assignment?.self_assigned

  return (
    <DashboardLayout>
      <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Volunteer Command Center</h1>
            <p className="text-gray-500 text-sm mt-1">
              {profile ? `${profile.district} District · Volunteer ID on file` : `Welcome, ${user?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {profile?.availability && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${availabilityStyle[profile.availability] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {profile.availability}
              </span>
            )}
            {profile?.approved
              ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full"><CheckCircle size={12} /> Approved</span>
              : <span className="flex items-center gap-1.5 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full"><Clock size={12} /> Pending Approval</span>
            }
          </div>
        </motion.div>

        {/* Pending assignment banner — authority assigned, awaiting response */}
        {isPendingAssignment && (
          <motion.div variants={fadeUp} className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Authority Assigned You to an Incident</p>
                  <p className="text-amber-700 text-sm mt-0.5">
                    {incident?.disaster_type} in {incident?.district} — {incident?.people_trapped} people trapped
                  </p>
                  <p className="text-amber-600 text-xs mt-1">Please accept or decline based on your current availability.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => respondToAssignment('reject')}
                  disabled={responding}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  <X size={14} /> Decline
                </button>
                <button
                  onClick={() => respondToAssignment('accept')}
                  disabled={responding}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {responding ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={14} />}
                  Accept
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Registered Skills', value: profile?.skills?.length ?? '—', icon: Zap, color: 'text-blue-600 bg-blue-50' },
            { label: 'Active Assignment', value: incident ? '1' : '0', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
            { label: 'Blood Group', value: profile?.blood_group ?? '—', icon: Heart, color: 'text-red-600 bg-red-50' },
            { label: 'District Coverage', value: profile?.district ?? '—', icon: MapPin, color: 'text-green-600 bg-green-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Assignment */}
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Activity size={17} className="text-orange-500" /> Active Assignment
            </h2>
            {incident ? (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{incident.disaster_type}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {incident.village}, {incident.district}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{incident.people_trapped} people trapped</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${
                      incident.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                      incident.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{incident.priority}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-100 flex items-center gap-2 text-xs text-gray-500">
                    <Shield size={12} className="text-orange-400" />
                    Status: <span className="font-semibold text-gray-700">{incident.status}</span>
                  </div>
                </div>

                {/* Citizen contact */}
                {citizenContact && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-800 mb-0.5">Citizen in Need</p>
                      <p className="font-bold text-gray-900 text-sm">{citizenContact.name}</p>
                    </div>
                    <a href={`tel:${citizenContact.phone}`} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                      <Phone size={12} /> {citizenContact.phone}
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Link to="/volunteer/track" className="text-center text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl transition-colors">
                    View Details
                  </Link>
                  <button className="text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors">
                    GPS Check-In
                  </button>
                </div>

                {/* Complete button — only show once assignment is accepted / en route */}
                {assignment && assignment.volunteer_status !== 'pending' && assignment.status !== 'Completed' && (
                  <button
                    onClick={markMissionComplete}
                    disabled={completing}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl transition-colors mt-1"
                  >
                    {completing
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Flag size={15} />}
                    {completing ? 'Completing...' : 'Mark Mission Complete'}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Shield size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">No active assignment</p>
                <p className="text-xs mt-1 text-gray-400">Browse open incidents or wait for authority assignment</p>
                <Link to="/volunteer/incidents" className="inline-block mt-3 text-xs font-bold text-primary-600 hover:underline">
                  Browse Open Incidents →
                </Link>
              </div>
            )}
          </motion.div>

          {/* Skills & Profile */}
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <User size={17} className="text-blue-500" /> My Volunteer Profile
            </h2>
            {profile ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Registered Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills?.map((skill, i) => (
                      <span key={skill} className={`text-xs font-semibold px-3 py-1 rounded-full ${skillColors[i % skillColors.length]}`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Blood Group', value: profile.blood_group, highlight: 'text-red-600' },
                    { label: 'Availability', value: profile.availability },
                    { label: 'District', value: profile.district },
                    { label: 'Status', value: profile.status, highlight: profile.status === 'Active' ? 'text-green-600' : 'text-gray-500' },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className={`font-bold text-sm ${highlight || 'text-gray-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <Link to="/citizen/profile" className="block text-center text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl transition-colors">
                  Edit Profile
                </Link>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <User size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">Volunteer profile not found</p>
                <p className="text-xs mt-1 text-gray-400">Try: vol1@drcs.gov.in / password123</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* AI Mission Briefing */}
        {(briefingLoading || briefing) && (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={17} className="text-purple-500" />
              AI Mission Briefing
              {briefingLoading && <span className="text-xs text-purple-400 font-normal animate-pulse">Generating...</span>}
            </h2>

            {briefingLoading ? (
              <div className="space-y-3">
                {[80, 60, 90, 70].map(w => (
                  <div key={w} className={`h-3 bg-purple-50 rounded-full animate-pulse`} style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : briefing && (
              <div className="space-y-4">
                {/* Headline */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="font-bold text-purple-900 text-sm leading-snug">{briefing.headline}</p>
                </div>

                {/* Situation overview */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Situation Overview</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{briefing.situation_overview}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Equipment */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package size={11} /> Equipment Needed
                    </p>
                    <ul className="space-y-1">
                      {briefing.equipment_needed?.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Safety */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertCircle size={11} /> Safety Precautions
                    </p>
                    <ul className="space-y-1">
                      {briefing.safety_precautions?.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0 mt-1" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Priority actions */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ChevronRight size={11} /> Priority Actions
                  </p>
                  <ol className="space-y-1.5">
                    {briefing.priority_actions?.map((a, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-gray-700">
                        <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-[10px]">{i + 1}</span>
                        {a}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-wrap gap-3">
                  {briefing.estimated_duration && (
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600">
                      <Clock size={11} /> Est. Duration: <span className="font-bold">{briefing.estimated_duration}</span>
                    </div>
                  )}
                  {briefing.special_notes && (
                    <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
                      ⚠️ {briefing.special_notes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/volunteer/incidents', icon: Globe, label: 'Open Incidents', color: 'bg-primary-50 text-primary-600' },
              { to: '/volunteer/track', icon: Activity, label: 'My Assignments', color: 'bg-orange-50 text-orange-600' },
              { to: '/citizen/report', icon: AlertTriangle, label: 'Report Incident', color: 'bg-red-50 text-red-600' },
              { to: '/citizen/profile', icon: User, label: 'Update Profile', color: 'bg-blue-50 text-blue-600' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link key={label} to={to} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Emergency strip */}
        <motion.div variants={fadeUp} className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-red-500" />
              <div>
                <p className="font-bold text-red-900 text-sm">Emergency Coordination Lines</p>
                <p className="text-red-500 text-xs">Contact authority immediately for critical situations</p>
              </div>
            </div>
            <div className="flex gap-6 flex-wrap">
              {[{ label: 'NDRF', number: '011-24363260' }, { label: 'State EOC', number: '0612-2217305' }, { label: 'Emergency', number: '112' }].map(({ label, number }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-bold text-red-700 text-sm">{number}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </motion.div>
    </DashboardLayout>
  )
}

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Download, Eye, MapPin, Clock, AlertTriangle,
  CheckCircle, Users, FileText, Phone, Shield, UserCheck
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

export default function TrackIncident() {
  const [incidents, setIncidents] = useState([])
  const [assignmentMap, setAssignmentMap] = useState({})   // incident_id → assignment
  const [volunteerMap, setVolunteerMap] = useState({})      // volunteer_id → volunteer
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [downloading, setDownloading] = useState(null)

  const loadAll = async () => {
    try {
      const [incRes, asgRes, volRes] = await Promise.all([
        api.get('/incidents/', { params: { per_page: 200 } }),
        api.get('/assignments/'),
        api.get('/volunteers/'),
      ])

      setIncidents(incRes.data.items || [])

      // Build volunteer lookup map
      const vMap = {}
      for (const v of (volRes.data.items || [])) vMap[v.id] = v
      setVolunteerMap(vMap)

      // Build assignment map: latest assignment per incident
      const aMap = {}
      for (const a of (asgRes.data.items || [])) {
        if (!aMap[a.incident_id] || a.assigned_at > aMap[a.incident_id].assigned_at) {
          aMap[a.incident_id] = a
        }
      }
      setAssignmentMap(aMap)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadAll()
    const id = setInterval(loadAll, 20000)
    return () => clearInterval(id)
  }, [])

  const filtered = incidents.filter(i =>
    search === '' ||
    i.disaster_type?.toLowerCase().includes(search.toLowerCase()) ||
    i.district?.toLowerCase().includes(search.toLowerCase()) ||
    i.village?.toLowerCase().includes(search.toLowerCase()) ||
    i.status?.toLowerCase().includes(search.toLowerCase())
  )

  const downloadPdf = async (incidentId) => {
    setDownloading(incidentId)
    try {
      const res = await api.get(`/reports/incident/${incidentId}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `incident_report_${incidentId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch { toast.error('Failed to download PDF') }
    setDownloading(null)
  }

  const statusSteps = ['Pending', 'Under Review', 'Rescue Assigned', 'In Progress', 'Completed']

  const selectedAssignment = selected ? assignmentMap[selected.id] : null
  const selectedVolunteers = selectedAssignment?.team_members?.map(id => volunteerMap[id]).filter(Boolean) || []

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Track My Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Monitor the status of all your incident reports</p>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search by disaster type, district, status..."
          />
        </div>

        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((incident, i) => {
              const asgn = assignmentMap[incident.id]
              const assignedVols = asgn?.team_members?.map(id => volunteerMap[id]).filter(Boolean) || []
              const isAssigned = assignedVols.length > 0 && ['Rescue Assigned', 'In Progress'].includes(incident.status)

              return (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`card overflow-hidden ${isAssigned ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          incident.priority === 'Critical' ? 'bg-red-100' :
                          incident.priority === 'High' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                          <AlertTriangle size={18} className={
                            incident.priority === 'Critical' ? 'text-red-600' :
                            incident.priority === 'High' ? 'text-orange-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{incident.disaster_type}</span>
                            <PriorityBadge priority={incident.priority} />
                            <StatusBadge status={incident.status} />
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin size={12} /> {incident.village}, {incident.district}
                          </p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                            <span>{incident.people_trapped} trapped</span>
                            {incident.medical_emergency && <span className="text-red-500 font-semibold">Medical Emergency</span>}
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {incident.created_at ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true }) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setSelected(incident)} className="btn-secondary py-1.5 px-3 text-sm">
                          <Eye size={14} /> View
                        </button>
                        <button
                          onClick={() => downloadPdf(incident.id)}
                          disabled={downloading === incident.id}
                          className="btn-secondary py-1.5 px-3 text-sm"
                        >
                          {downloading === incident.id
                            ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            : <Download size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* ── Volunteer contact strip — shown directly on the card ── */}
                    {isAssigned && (
                      <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle size={13} className="text-white" />
                          </div>
                          <p className="font-bold text-green-800 text-sm">Help is on the way!</p>
                          {asgn?.eta && asgn.eta !== 'En Route' && (
                            <span className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded-lg ml-auto">
                              ETA: {asgn.eta}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {assignedVols.map(vol => (
                            <div key={vol.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-green-100 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <UserCheck size={16} className="text-green-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{vol.name}</p>
                                  <p className="text-xs text-gray-400">
                                    {vol.district} · {vol.skills?.slice(0, 2).join(', ')}
                                    {vol.blood_group && ` · 🩸 ${vol.blood_group}`}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={`tel:${vol.phone}`}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
                              >
                                <Phone size={14} /> {vol.phone}
                              </a>
                            </div>
                          ))}
                        </div>
                        {asgn?.notes && (
                          <p className="text-xs text-green-700 mt-2 italic bg-green-100 rounded-lg px-3 py-1.5">
                            "{asgn.notes}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Progress tracker */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center">
                        {statusSteps.map((s, idx) => {
                          const currentIdx = statusSteps.indexOf(incident.status)
                          const isDone = idx <= currentIdx
                          const isCurrent = idx === currentIdx
                          return (
                            <div key={s} className="flex-1 flex flex-col items-center">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary-600 border-primary-600' : 'border-gray-200'}`}>
                                {isDone && <CheckCircle size={10} className="text-white" />}
                              </div>
                              <p className={`text-xs mt-1 text-center hidden sm:block ${isCurrent ? 'text-primary-600 font-semibold' : isDone ? 'text-gray-600' : 'text-gray-300'}`}>
                                {s.split(' ')[0]}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex mt-1">
                        {statusSteps.slice(0, -1).map((_, idx) => {
                          const currentIdx = statusSteps.indexOf(incident.status)
                          return (
                            <div key={idx} className={`flex-1 h-0.5 rounded ${idx < currentIdx ? 'bg-primary-600' : 'bg-gray-200'}`} />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Incident Details" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold text-gray-900">{selected.disaster_type}</span>
              <PriorityBadge priority={selected.priority} />
              <StatusBadge status={selected.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'District', value: selected.district },
                { label: 'Village', value: selected.village },
                { label: 'People Trapped', value: selected.people_trapped },
                { label: 'Water Level', value: selected.water_level },
                { label: 'Reported', value: selected.created_at ? format(new Date(selected.created_at), 'dd MMM yyyy HH:mm') : '-' },
                { label: 'Priority Score', value: (selected.priority_score ?? '—') + '/100' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                  <p className="font-semibold text-gray-900 text-sm">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {selected.medical_emergency && <span className="badge-critical">⚕️ Medical Emergency</span>}
              {selected.children_present && <span className="badge-high">👶 Children</span>}
              {selected.senior_citizens_present && <span className="badge-medium">👴 Seniors</span>}
              {selected.pregnant_woman_present && <span className="badge-critical">🤱 Pregnant</span>}
            </div>

            {selected.description && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">{selected.description}</p>
              </div>
            )}

            {selected.priority_reasoning && (
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
                <p className="text-sm font-bold text-primary-800 mb-1">🤖 AI Priority Analysis</p>
                <p className="text-sm text-primary-600 leading-relaxed">{selected.priority_reasoning}</p>
                {selected.recommended_resources?.length > 0 && (
                  <p className="text-xs text-primary-500 mt-2">Recommended: {selected.recommended_resources.join(', ')}</p>
                )}
                {selected.estimated_response_time && (
                  <p className="text-xs text-primary-500 mt-1">Est. Response: {selected.estimated_response_time}</p>
                )}
              </div>
            )}

            {selected.image_url && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Incident Photo</p>
                <img src={selected.image_url} alt="Incident" className="w-full rounded-xl max-h-64 object-cover" />
              </div>
            )}

            {/* Assignment info */}
            {selectedAssignment && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                  <Shield size={15} /> Rescue Assignment
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Team:</span> <span className="font-semibold">{selectedAssignment.team_type}</span></div>
                  <div><span className="text-gray-500">ETA:</span> <span className="font-semibold text-primary-600">{selectedAssignment.eta}</span></div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedAssignment.status} /></div>
                </div>
                {selectedAssignment.notes && <p className="text-xs text-gray-600 mt-2 italic">"{selectedAssignment.notes}"</p>}
              </div>
            )}

            {/* Volunteer contact — prominent in modal */}
            {selectedVolunteers.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5">
                <p className="text-sm font-bold text-green-800 mb-4 flex items-center gap-2">
                  <Phone size={16} className="text-green-600" />
                  Your Assigned Volunteer{selectedVolunteers.length > 1 ? 's' : ''} — Contact Directly
                </p>
                <div className="space-y-3">
                  {selectedVolunteers.map(vol => (
                    <div key={vol.id} className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-green-700 font-bold text-lg">
                            {vol.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{vol.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {vol.district} District
                              {vol.blood_group && <span className="ml-2 text-red-500 font-semibold">🩸 {vol.blood_group}</span>}
                            </p>
                            {vol.skills?.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {vol.skills.slice(0, 3).map(s => (
                                  <span key={s} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <a
                          href={`tel:${vol.phone}`}
                          className="flex flex-col items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-xl transition-colors shadow-sm flex-shrink-0"
                        >
                          <Phone size={18} />
                          <span className="text-xs">{vol.phone}</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-600 mt-3 text-center font-medium">
                  Call your volunteer directly for real-time updates on arrival
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => downloadPdf(selected.id)}
                disabled={downloading === selected.id}
                className="btn-primary flex-1 justify-center"
              >
                {downloading === selected.id
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Download size={16} />}
                Download PDF Report
              </button>
              <button onClick={() => setSelected(null)} className="btn-secondary px-4">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

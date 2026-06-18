import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search, AlertTriangle, MapPin, Users, RefreshCw,
  Eye, UserCheck, Download, X, CheckCircle, Clock,
  Phone, Heart, Shield, ChevronRight, Sparkles, Star, Loader2
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import IncidentMap from '../../components/map/IncidentMap'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const DISTRICTS = ['All', 'Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali']
const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low']
const STATUSES = ['All', 'Pending', 'Under Review', 'Rescue Assigned', 'In Progress', 'Completed']
const TEAM_TYPES = ['Boat Rescue Team', 'Medical Team', 'Fire Team', 'Police Unit', 'Volunteer Group', 'Army Unit', 'NDRF Team']

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [assignmentMap, setAssignmentMap] = useState({}) // incident_id → assignment
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ district: 'All', priority: 'All', status: 'All' })
  const [viewMode, setViewMode] = useState('list')

  const [selected, setSelected] = useState(null)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [selectedVolunteerDetails, setSelectedVolunteerDetails] = useState([])

  const [assignModal, setAssignModal] = useState(null)
  const [assignForm, setAssignForm] = useState({ team_type: '', eta: '', notes: '', volunteer_ids: [] })
  const [assigning, setAssigning] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(null)
  const [aiRankings, setAiRankings] = useState({}) // vol_id → { match_score, match_level, reason }
  const [aiRankLoading, setAiRankLoading] = useState(false)

  const loadIncidents = async () => {
    setLoading(true)
    try {
      const params = { per_page: 500 }
      if (filters.district !== 'All') params.district = filters.district
      if (filters.priority !== 'All') params.priority = filters.priority
      if (filters.status !== 'All') params.status = filters.status
      if (search) params.search = search
      const res = await api.get('/incidents/', { params })
      setIncidents(res.data.items || [])
    } catch {}
    setLoading(false)
  }

  const loadVolunteers = async () => {
    try {
      const res = await api.get('/volunteers/')
      setVolunteers(res.data.items || [])
    } catch {}
  }

  const loadAssignments = async () => {
    try {
      const res = await api.get('/assignments/')
      const map = {}
      for (const a of (res.data.items || [])) {
        if (!map[a.incident_id] || a.assigned_at > map[a.incident_id].assigned_at) {
          map[a.incident_id] = a
        }
      }
      setAssignmentMap(map)
    } catch {}
  }

  const silentRefresh = async () => {
    try {
      const params = { per_page: 500 }
      if (filters.district !== 'All') params.district = filters.district
      if (filters.priority !== 'All') params.priority = filters.priority
      if (filters.status !== 'All') params.status = filters.status
      if (search) params.search = search
      const res = await api.get('/incidents/', { params })
      setIncidents(res.data.items || [])
    } catch {}
  }

  useEffect(() => {
    loadIncidents()
    loadVolunteers()
    loadAssignments()
  }, [filters, search])

  // Auto-refresh every 20 seconds to pick up volunteer self-assignments and status changes
  useEffect(() => {
    const id = setInterval(() => { silentRefresh(); loadAssignments() }, 20000)
    return () => clearInterval(id)
  }, [filters, search])

  const openDetail = async (incident) => {
    setSelected(incident)
    setSelectedAssignment(null)
    setSelectedVolunteerDetails([])
    try {
      const [asgRes, volRes] = await Promise.all([
        api.get('/assignments/', { params: { incident_id: incident.id } }),
        api.get('/volunteers/'),
      ])
      const items = asgRes.data.items || []
      const asgn = items[items.length - 1] || null
      setSelectedAssignment(asgn)
      const allVols = volRes.data.items || []
      if (asgn?.team_members?.length) {
        setSelectedVolunteerDetails(allVols.filter(v => asgn.team_members.includes(v.id)))
      }
    } catch {}
  }

  const openAssignModal = async (incident) => {
    setAssignModal(incident)
    setAssignForm({ team_type: 'Volunteer Group', eta: '', notes: '', volunteer_ids: [] })
    setAiRankings({})
    setAiRankLoading(true)
    try {
      const res = await api.post('/ai/volunteer-match', { incident_id: incident.id })
      const map = {}
      for (const r of (res.data.rankings || [])) {
        map[r.id] = r
      }
      setAiRankings(map)
    } catch {}
    setAiRankLoading(false)
  }

  const toggleVolunteer = (volId) => {
    setAssignForm(prev => ({
      ...prev,
      volunteer_ids: prev.volunteer_ids.includes(volId)
        ? prev.volunteer_ids.filter(id => id !== volId)
        : [...prev.volunteer_ids, volId],
    }))
  }

  const handleAssign = async () => {
    if (!assignForm.eta) return toast.error('Please enter an ETA')
    if (assignForm.volunteer_ids.length === 0 && assignForm.team_type === 'Volunteer Group')
      return toast.error('Select at least one volunteer, or change the team type')
    setAssigning(true)
    try {
      await api.post('/assignments/', {
        incident_id: assignModal.id,
        team_type: assignForm.team_type,
        eta: assignForm.eta,
        notes: assignForm.notes,
        team_members: assignForm.volunteer_ids,
        resource_ids: [],
      })
      toast.success('Assignment created! Volunteer(s) notified.')
      setAssignModal(null)
      loadIncidents()
      loadVolunteers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Assignment failed')
    }
    setAssigning(false)
  }

  const updateStatus = async (incidentId, status) => {
    setStatusUpdating(incidentId)
    try {
      await api.patch(`/incidents/${incidentId}/status`, { status })
      toast.success(`Status updated to "${status}"`)
      loadIncidents()
    } catch {
      toast.error('Failed to update status')
    }
    setStatusUpdating(null)
  }

  const downloadPdf = async (incidentId) => {
    setDownloading(incidentId)
    try {
      const res = await api.get(`/reports/incident/${incidentId}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `incident_${incidentId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch { toast.error('Download failed') }
    setDownloading(null)
  }

  const availableVols = assignModal
    ? volunteers
        .filter(v => !v.assigned_incident_id)
        .sort((a, b) => (aiRankings[b.id]?.match_score ?? 0) - (aiRankings[a.id]?.match_score ?? 0))
    : []
  const sameDistrictVols = availableVols.filter(v => v.district?.toLowerCase() === assignModal?.district?.toLowerCase())
  const otherVols = availableVols.filter(v => v.district?.toLowerCase() !== assignModal?.district?.toLowerCase())

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="page-title">Incident Management</h1>
            <p className="text-gray-500 text-sm">{incidents.length} incidents • {incidents.filter(i => !['Completed', 'Closed'].includes(i.status)).length} active</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadIncidents(); loadVolunteers(); loadAssignments() }} className="btn-secondary text-sm py-2 px-3"><RefreshCw size={14} /></button>
            <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="btn-secondary text-sm py-2 px-3">
              <MapPin size={14} /> {viewMode === 'list' ? 'Map View' : 'List View'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-2 text-sm" placeholder="Search incidents..." />
            </div>
            {[
              { key: 'district', options: DISTRICTS, label: 'District' },
              { key: 'priority', options: PRIORITIES, label: 'Priority' },
              { key: 'status', options: STATUSES, label: 'Status' },
            ].map(({ key, options, label }) => (
              <select key={key} value={filters[key]} onChange={e => setFilters(p => ({ ...p, [key]: e.target.value }))} className="input py-2 text-sm w-auto">
                {options.map(o => <option key={o} value={o}>{o === 'All' ? `All ${label}s` : o}</option>)}
              </select>
            ))}
          </div>
        </div>

        {loading ? <PageLoader /> : (
          viewMode === 'map' ? (
            <IncidentMap incidents={incidents} height="600px" />
          ) : (
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="card p-12 text-center">
                  <AlertTriangle size={40} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No incidents found</p>
                </div>
              ) : incidents.map((incident, i) => {
                const asgn = assignmentMap[incident.id]
                const assignedVols = asgn?.team_members?.length
                  ? volunteers.filter(v => asgn.team_members.includes(v.id))
                  : []
                return (
                <motion.div key={incident.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className={`card p-4 ${asgn?.self_assigned ? 'border-l-4 border-l-blue-400' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${incident.priority === 'Critical' ? 'bg-red-100' : incident.priority === 'High' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                      <AlertTriangle size={18} className={incident.priority === 'Critical' ? 'text-red-600' : incident.priority === 'High' ? 'text-orange-600' : 'text-blue-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{incident.disaster_type}</span>
                            <PriorityBadge priority={incident.priority} />
                            <StatusBadge status={incident.status} />
                            {asgn?.self_assigned && (
                              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">Volunteer Self-Assigned</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">{incident.name}</span> • {incident.phone} •
                            <MapPin size={11} className="inline mx-1" />{incident.village}, {incident.district}
                          </p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1"><Users size={11} /> {incident.people_trapped} trapped</span>
                            {incident.medical_emergency && <span className="text-red-500 font-semibold">⚕️ Medical</span>}
                            {incident.children_present && <span className="text-orange-500 font-semibold">👶 Children</span>}
                            {incident.pregnant_woman_present && <span className="text-pink-500 font-semibold">🤱 Pregnant</span>}
                            <span className="flex items-center gap-1"><Clock size={11} /> {incident.created_at ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true }) : ''}</span>
                          </div>
                          {/* Inline volunteer assignment strip */}
                          {assignedVols.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {assignedVols.map(v => (
                                <span key={v.id} className="flex items-center gap-1.5 text-xs font-semibold bg-green-50 text-green-800 border border-green-200 px-2.5 py-1 rounded-lg">
                                  <UserCheck size={11} /> {v.name}
                                  <a href={`tel:${v.phone}`} onClick={e => e.stopPropagation()} className="text-green-600 hover:text-green-800 ml-1">
                                    <Phone size={10} />
                                  </a>
                                </span>
                              ))}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                                asgn.volunteer_status === 'accepted' ? 'bg-green-100 text-green-700' :
                                asgn.volunteer_status === 'rejected' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-700'}`}>
                                {asgn.volunteer_status === 'accepted' ? '✓ Accepted' :
                                 asgn.volunteer_status === 'rejected' ? '✗ Rejected' : '⏳ Awaiting response'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <button onClick={() => openDetail(incident)} className="btn-secondary py-1.5 px-2.5 text-sm"><Eye size={14} /></button>
                          {!['Completed', 'Closed', 'Rescue Assigned', 'In Progress'].includes(incident.status) && (
                            <button onClick={() => openAssignModal(incident)} className="btn-primary py-1.5 px-3 text-sm">
                              <UserCheck size={14} /> Assign
                            </button>
                          )}
                          <select
                            value={incident.status}
                            onChange={e => updateStatus(incident.id, e.target.value)}
                            disabled={statusUpdating === incident.id}
                            className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white text-gray-700 hover:border-primary-300 transition-colors cursor-pointer"
                          >
                            {STATUSES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => downloadPdf(incident.id)} disabled={downloading === incident.id} className="btn-secondary py-1.5 px-2.5 text-sm">
                            {downloading === incident.id ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Download size={14} />}
                          </button>
                        </div>
                      </div>
                      {incident.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{incident.description}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )})}

            </div>
          )
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Incident Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-bold">{selected.disaster_type}</span>
              <PriorityBadge priority={selected.priority} />
              <StatusBadge status={selected.status} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Reporter', value: selected.name },
                { label: 'Phone', value: selected.phone },
                { label: 'District', value: selected.district },
                { label: 'Village', value: selected.village },
                { label: 'People Trapped', value: selected.people_trapped },
                { label: 'Water Level', value: selected.water_level },
                { label: 'Priority Score', value: `${selected.priority_score}/100` },
                { label: 'GPS', value: selected.lat ? `${selected.lat}, ${selected.lng}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-semibold text-gray-900 text-sm">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.medical_emergency && <span className="badge-critical">⚕️ Medical Emergency</span>}
              {selected.children_present && <span className="badge-high">👶 Children</span>}
              {selected.senior_citizens_present && <span className="badge-medium">👴 Seniors</span>}
              {selected.pregnant_woman_present && <span className="badge-critical">🤱 Pregnant</span>}
            </div>
            {selected.description && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
              </div>
            )}
            {selected.priority_reasoning && (
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3">
                <p className="text-xs font-bold text-primary-800 mb-1">🤖 AI Analysis</p>
                <p className="text-xs text-primary-600 leading-relaxed">{selected.priority_reasoning}</p>
                {selected.recommended_resources?.length > 0 && (
                  <p className="text-xs text-primary-500 mt-1">Recommended: {selected.recommended_resources.join(', ')}</p>
                )}
              </div>
            )}
            {selected.image_url && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Incident Photo</p>
                <img src={selected.image_url} alt="Incident" className="w-full rounded-xl max-h-48 object-cover" />
              </div>
            )}

            {/* Assignment section */}
            {selectedAssignment ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                      <CheckCircle size={15} /> Rescue Assignment Active
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedAssignment.self_assigned && (
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">Self-assigned</span>
                      )}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        selectedAssignment.volunteer_status === 'accepted' ? 'bg-green-100 text-green-700' :
                        selectedAssignment.volunteer_status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedAssignment.volunteer_status === 'accepted' ? '✓ Accepted' :
                         selectedAssignment.volunteer_status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Team:</span> <span className="font-semibold">{selectedAssignment.team_type}</span></div>
                    <div><span className="text-gray-500">ETA:</span> <span className="font-semibold text-primary-600">{selectedAssignment.eta}</span></div>
                    <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedAssignment.status} /></div>
                  </div>
                  {selectedAssignment.notes && <p className="text-xs text-gray-600 mt-2 italic">"{selectedAssignment.notes}"</p>}
                </div>

                {/* Assigned volunteer cards */}
                {selectedVolunteerDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned Volunteer{selectedVolunteerDetails.length > 1 ? 's' : ''}</p>
                    {selectedVolunteerDetails.map(vol => (
                      <div key={vol.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 mb-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{vol.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{vol.district} · {vol.skills?.slice(0, 2).join(', ')}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${vol.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{vol.status}</span>
                            {vol.blood_group && <span className="text-xs text-red-500 font-semibold">🩸 {vol.blood_group}</span>}
                          </div>
                        </div>
                        <a href={`tel:${vol.phone}`} className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                          <Phone size={12} /> {vol.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              !['Completed', 'Closed'].includes(selected.status) && (
                <button
                  onClick={() => { setAssignModal(selected); setSelected(null) }}
                  className="btn-primary w-full justify-center"
                >
                  <UserCheck size={16} /> Assign Rescue Team / Volunteer
                </button>
              )
            )}

            <button onClick={() => downloadPdf(selected.id)} className="btn-secondary w-full justify-center">
              <Download size={16} /> Download PDF Report
            </button>
          </div>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Rescue Team" size="lg">
        {assignModal && (
          <div className="space-y-5">
            {/* Incident summary */}
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-sm">{assignModal.disaster_type}</p>
                <p className="text-xs text-gray-500">{assignModal.village}, {assignModal.district} · {assignModal.people_trapped} trapped</p>
              </div>
              <PriorityBadge priority={assignModal.priority} />
            </div>

            {/* Team type */}
            <div>
              <label className="label">Team Type *</label>
              <select value={assignForm.team_type} onChange={e => setAssignForm(p => ({ ...p, team_type: e.target.value }))} className="input">
                <option value="">Select team type</option>
                {TEAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Volunteer picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0 flex items-center gap-2">
                  Select Volunteer(s)
                  {aiRankLoading && <Loader2 size={13} className="animate-spin text-purple-500" />}
                  {!aiRankLoading && Object.keys(aiRankings).length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      <Sparkles size={9} /> AI Ranked
                    </span>
                  )}
                </label>
                <span className="text-xs text-gray-400">{assignForm.volunteer_ids.length} selected</span>
              </div>

              {availableVols.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">No available volunteers right now</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sameDistrictVols.length > 0 && (
                    <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest px-1">Same District — {assignModal.district}</p>
                  )}
                  {sameDistrictVols.map(vol => (
                    <VolunteerPickerRow key={vol.id} vol={vol} selected={assignForm.volunteer_ids.includes(vol.id)} onToggle={() => toggleVolunteer(vol.id)} highlight rank={aiRankings[vol.id]} />
                  ))}
                  {otherVols.length > 0 && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mt-3">Other Districts</p>
                  )}
                  {otherVols.map(vol => (
                    <VolunteerPickerRow key={vol.id} vol={vol} selected={assignForm.volunteer_ids.includes(vol.id)} onToggle={() => toggleVolunteer(vol.id)} rank={aiRankings[vol.id]} />
                  ))}
                </div>
              )}
            </div>

            {/* ETA */}
            <div>
              <label className="label">Estimated Arrival Time *</label>
              <input value={assignForm.eta} onChange={e => setAssignForm(p => ({ ...p, eta: e.target.value }))} className="input" placeholder="e.g. 30 minutes, 1 hour 30 minutes" />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Instructions / Notes</label>
              <textarea value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} className="input min-h-16 resize-none" placeholder="Special instructions for the rescue team..." />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-0.5">What happens next:</p>
              <p>• Citizen gets a notification that help is on the way</p>
              <p>• Selected volunteer(s) get a notification to accept/decline</p>
              <p>• Status updates automatically when volunteer responds</p>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAssign} disabled={assigning} className="btn-primary flex-1 justify-center">
                {assigning ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserCheck size={16} />}
                {assigning ? 'Assigning...' : 'Confirm & Notify'}
              </button>
              <button onClick={() => setAssignModal(null)} className="btn-secondary px-4">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

function VolunteerPickerRow({ vol, selected, onToggle, highlight, rank }) {
  const matchStyle = {
    'Best Match': 'bg-purple-100 text-purple-700 border-purple-200',
    'Good Match': 'bg-green-100 text-green-700 border-green-200',
    'Partial Match': 'bg-gray-100 text-gray-500 border-gray-200',
  }[rank?.match_level] || ''

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
        selected
          ? 'bg-primary-50 border-primary-300'
          : rank?.match_level === 'Best Match'
          ? 'bg-purple-50/40 border-purple-200 hover:border-purple-300'
          : highlight
          ? 'bg-white border-gray-200 hover:border-primary-200'
          : 'bg-white border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
        {selected && <CheckCircle size={12} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{vol.name}</span>
          {vol.blood_group && <span className="text-xs text-red-500 font-bold">🩸 {vol.blood_group}</span>}
          {rank?.match_level && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${matchStyle}`}>
              {rank.match_level === 'Best Match' && <Sparkles size={8} />}
              {rank.match_level === 'Good Match' && <Star size={8} />}
              {rank.match_level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin size={9} /> {vol.district}</span>
          <span className="text-xs text-gray-400">{vol.availability}</span>
          {vol.skills?.slice(0, 2).map(s => (
            <span key={s} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{s}</span>
          ))}
        </div>
        {rank?.reason && (
          <p className="text-[10px] text-purple-500 mt-0.5 italic leading-tight">{rank.reason}</p>
        )}
      </div>
      <a href={`tel:${vol.phone}`} onClick={e => e.stopPropagation()} className="text-xs text-gray-400 hover:text-primary-600 font-medium flex items-center gap-1 flex-shrink-0">
        <Phone size={11} /> {vol.phone}
      </a>
    </button>
  )
}

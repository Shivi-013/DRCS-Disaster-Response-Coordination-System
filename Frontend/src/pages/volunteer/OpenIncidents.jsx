import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, AlertTriangle, Clock, CheckCircle, Search, Heart, Package, X, ChevronDown, Flag } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import { useAuth } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const SKILLS = ['First Aid', 'Swimming', 'Search & Rescue', 'Medical', 'Firefighting', 'Driving', 'Communication', 'Engineering', 'Cooking', 'Counselling']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const AVAILABILITY = ['Full Time', 'Part Time', 'On Call', 'Weekends']
const DISTRICTS = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali', 'Gaya', 'Bhagalpur', 'Munger', 'Begusarai', 'Nalanda', 'Araria', 'Madhubani']
const RESOURCE_TYPES = ['Boat', 'Life Jacket', 'Medical Kit', 'Food Pack', 'Water Tanker', 'Rescue Rope', 'Generator', 'Blanket', 'Tent', 'Medicine', 'Ambulance', 'Other']

export default function OpenIncidents() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [myAssignment, setMyAssignment] = useState(null)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all')

  // Create profile modal
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', district: '', blood_group: '', skills: [], availability: 'On Call' })
  const [creatingProfile, setCreatingProfile] = useState(false)

  // Resource request modal
  const [resourceModal, setResourceModal] = useState(null)
  const [resourceForm, setResourceForm] = useState({ resource_type: '', quantity: 1, urgency: 'High', notes: '' })
  const [requestingResource, setRequestingResource] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [incRes, volRes] = await Promise.all([
        api.get('/incidents/', { params: { per_page: 500 } }),
        api.get('/volunteers/'),
      ])
      setIncidents(incRes.data.items || [])
      const mine = (volRes.data.items || []).find(v => v.email === user?.email)
      setMyProfile(mine || null)

      if (mine?.assigned_incident_id) {
        try {
          const assignRes = await api.get('/assignments/', { params: { incident_id: mine.assigned_incident_id } })
          const items = assignRes.data.items || []
          setMyAssignment(items[items.length - 1] || null)
        } catch { setMyAssignment(null) }
      } else {
        setMyAssignment(null)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setProfileLoaded(true) }
  }

  const markComplete = async () => {
    if (!myAssignment) return
    setCompleting(true)
    try {
      await api.patch(`/assignments/${myAssignment.id}/complete`)
      toast.success('Mission complete! You can now take on a new incident.')
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to complete mission.')
    } finally { setCompleting(false) }
  }

  const selfAssign = async (incident) => {
    if (!myProfile) return setShowCreateProfile(true)
    if (!myProfile.approved) return toast.error('Your profile is pending authority approval.')
    if (myProfile.assigned_incident_id) return toast.error('You already have an active assignment.')
    setAssigning(incident.id)
    try {
      await api.post(`/volunteers/${myProfile.id}/self-assign`, { incident_id: incident.id })
      toast.success('Assigned! Authority notified. Citizen will be informed.')
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not assign. Try again.')
    } finally { setAssigning(null) }
  }

  const createProfile = async (e) => {
    e.preventDefault()
    if (!profileForm.district || !profileForm.blood_group || profileForm.skills.length === 0)
      return toast.error('Fill all required fields and select at least one skill')
    setCreatingProfile(true)
    try {
      await api.post('/volunteers/', {
        name: profileForm.name || user?.name,
        email: user?.email,
        phone: profileForm.phone || user?.phone,
        blood_group: profileForm.blood_group,
        skills: profileForm.skills,
        district: profileForm.district,
        availability: profileForm.availability,
      })
      toast.success('Profile created! Authority will review and approve it shortly.')
      setShowCreateProfile(false)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create profile')
    } finally { setCreatingProfile(false) }
  }

  const requestResource = async (e) => {
    e.preventDefault()
    if (!resourceForm.resource_type) return toast.error('Select a resource type')
    setRequestingResource(true)
    try {
      await api.post('/resource-requests/', {
        incident_id: resourceModal.id,
        resource_type: resourceForm.resource_type,
        quantity: resourceForm.quantity,
        urgency: resourceForm.urgency,
        notes: resourceForm.notes,
      })
      toast.success('Resource request sent to authority for approval!')
      setResourceModal(null)
      setResourceForm({ resource_type: '', quantity: 1, urgency: 'High', notes: '' })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send request')
    } finally { setRequestingResource(false) }
  }

  const toggleSkill = (skill) => {
    setProfileForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
    }))
  }

  const open = incidents.filter(i => ['Pending', 'Under Review'].includes(i.status))
  const filtered = open.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !q || i.disaster_type?.toLowerCase().includes(q) || i.district?.toLowerCase().includes(q)
    const matchScope = scope !== 'my' || !myProfile || i.district?.toLowerCase() === myProfile.district?.toLowerCase()
    return matchSearch && matchScope
  })

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Open Incidents</h1>
            <p className="text-gray-500 text-sm mt-1">Incidents needing volunteer response</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-600 font-medium">
              {open.length} open incident{open.length !== 1 ? 's' : ''}
            </div>
            {myProfile?.assigned_incident_id && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 text-sm text-orange-700 font-semibold flex items-center gap-2">
                <AlertTriangle size={14} /> Active mission in progress
              </div>
            )}
          </div>
        </div>

        {/* Profile status banners */}
        {profileLoaded && !myProfile && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-blue-900 text-sm">Complete Your Volunteer Profile</p>
              <p className="text-blue-600 text-xs mt-0.5">Create your profile so authority can approve you and you can self-assign to incidents.</p>
            </div>
            <button onClick={() => setShowCreateProfile(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl flex-shrink-0 transition-colors">
              Create Profile
            </button>
          </div>
        )}

        {profileLoaded && myProfile && !myProfile.approved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-yellow-800 text-sm">Profile Pending Approval</p>
              <p className="text-yellow-600 text-xs">Authority is reviewing your profile. Once approved you can self-assign to incidents. You can still request resources below.</p>
            </div>
          </div>
        )}

        {/* Active mission blocker — must complete current mission before taking a new one */}
        {profileLoaded && myProfile?.assigned_incident_id && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-orange-900">You have an active mission</p>
                  <p className="text-orange-700 text-sm mt-0.5">
                    Complete your current rescue mission before self-assigning to a new incident.
                    Authority can also only assign you to a new mission after your current one is done.
                  </p>
                  {myAssignment && (
                    <p className="text-orange-600 text-xs mt-1.5 font-medium">
                      Mission status: <span className="font-bold">{myAssignment.status}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={markComplete}
                disabled={completing || !myAssignment}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
              >
                {completing
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Flag size={14} />}
                {completing ? 'Completing...' : 'Mark Mission Complete'}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by type or district..." className="input pl-9" />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm font-semibold">
            {[['my', 'My District'], ['all', 'All Districts']].map(([v, l]) => (
              <button key={v} onClick={() => setScope(v)} className={`px-4 py-2.5 transition-colors ${scope === v ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Incident list */}
        {filtered.length === 0 ? (
          <div className="card p-14 text-center">
            <CheckCircle size={44} className="text-green-300 mx-auto mb-3" />
            <p className="text-gray-600 font-semibold">No open incidents {scope === 'my' ? 'in your district' : ''}</p>
            {scope === 'my' && <button onClick={() => setScope('all')} className="mt-3 text-primary-600 text-sm font-semibold hover:underline">View all districts →</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((incident, i) => {
              const pColor = {
                Critical: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-l-red-500' },
                High: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-l-orange-400' },
                Medium: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-l-blue-400' },
                Low: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-l-green-400' },
              }[incident.priority] || { bg: 'bg-gray-100', icon: 'text-gray-600', border: 'border-l-gray-300' }

              return (
                <motion.div key={incident.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${pColor.border} shadow-sm p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pColor.bg}`}>
                        <AlertTriangle size={18} className={pColor.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">{incident.disaster_type}</span>
                          <PriorityBadge priority={incident.priority} />
                          <StatusBadge status={incident.status} />
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin size={12} /> {incident.village}, {incident.district}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span className="font-semibold text-gray-600">{incident.people_trapped} people trapped</span>
                          {incident.medical_emergency && <span className="text-red-500 font-bold flex items-center gap-1"><Heart size={10} /> Medical Emergency</span>}
                          {incident.children_present && <span className="text-orange-500">Children present</span>}
                          <span className="flex items-center gap-1 ml-auto">
                            <Clock size={11} /> {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {incident.description && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2 bg-gray-50 rounded-lg p-2">{incident.description}</p>
                        )}
                        {incident.priority_reasoning && (
                          <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1">
                            🤖 <span className="line-clamp-1">{incident.priority_reasoning}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => selfAssign(incident)}
                        disabled={!!assigning || !!myProfile?.assigned_incident_id}
                        className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                      >
                        {assigning === incident.id
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <CheckCircle size={14} />}
                        I'll Handle This
                      </button>
                      <button
                        onClick={() => { setResourceModal(incident); setResourceForm({ resource_type: '', quantity: 1, urgency: 'High', notes: '' }) }}
                        className="bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-700 hover:text-orange-700 font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                      >
                        <Package size={14} /> Request Resources
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Profile Modal */}
      <Modal open={showCreateProfile} onClose={() => setShowCreateProfile(false)} title="Create Volunteer Profile" size="md">
        <form onSubmit={createProfile} className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            Authority will review and approve your profile. Once approved, you can self-assign to incidents.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input value={profileForm.name} onChange={e => setProfileForm(p => ({...p, name: e.target.value}))} className="input" placeholder={user?.name} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={profileForm.phone} onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))} className="input" placeholder={user?.phone} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">District *</label>
              <select required value={profileForm.district} onChange={e => setProfileForm(p => ({...p, district: e.target.value}))} className="input">
                <option value="">Select district</option>
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Blood Group *</label>
              <select required value={profileForm.blood_group} onChange={e => setProfileForm(p => ({...p, blood_group: e.target.value}))} className="input">
                <option value="">Select</option>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Availability</label>
            <select value={profileForm.availability} onChange={e => setProfileForm(p => ({...p, availability: e.target.value}))} className="input">
              {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Skills * (select all that apply)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SKILLS.map(skill => (
                <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${profileForm.skills.includes(skill) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                  {skill}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={creatingProfile} className="btn-primary flex-1 justify-center">
              {creatingProfile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={15} />}
              Submit for Approval
            </button>
            <button type="button" onClick={() => setShowCreateProfile(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Request Resources Modal */}
      <Modal open={!!resourceModal} onClose={() => setResourceModal(null)} title="Request Resources" size="md">
        {resourceModal && (
          <form onSubmit={requestResource} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-bold text-gray-900 text-sm">{resourceModal.disaster_type}</p>
              <p className="text-xs text-gray-500">{resourceModal.village}, {resourceModal.district}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              Your request will be sent to authority for approval. They will allocate resources based on availability.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Resource Type *</label>
                <select required value={resourceForm.resource_type} onChange={e => setResourceForm(p => ({...p, resource_type: e.target.value}))} className="input">
                  <option value="">Select type</option>
                  {RESOURCE_TYPES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" min={1} max={100} value={resourceForm.quantity} onChange={e => setResourceForm(p => ({...p, quantity: parseInt(e.target.value)}))} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Urgency</label>
              <div className="flex gap-2">
                {['Low', 'Medium', 'High', 'Critical'].map(u => (
                  <button key={u} type="button" onClick={() => setResourceForm(p => ({...p, urgency: u}))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${resourceForm.urgency === u
                      ? u === 'Critical' ? 'bg-red-600 text-white border-red-600'
                        : u === 'High' ? 'bg-orange-500 text-white border-orange-500'
                        : u === 'Medium' ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-500 text-white border-gray-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Notes / Reason</label>
              <textarea value={resourceForm.notes} onChange={e => setResourceForm(p => ({...p, notes: e.target.value}))} className="input min-h-16 resize-none" placeholder="Explain why this resource is needed..." />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={requestingResource} className="btn-primary flex-1 justify-center">
                {requestingResource ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Package size={15} />}
                Send Request to Authority
              </button>
              <button type="button" onClick={() => setResourceModal(null)} className="btn-secondary px-4">Cancel</button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  )
}

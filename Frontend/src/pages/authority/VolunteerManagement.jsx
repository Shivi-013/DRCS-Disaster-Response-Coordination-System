import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Search, RefreshCw, CheckCircle, X, UserX,
  Phone, MapPin, Heart, Briefcase, Plus, Filter
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { StatusBadge, Badge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Modal from '../../components/common/Modal'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api, useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const DISTRICTS = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali']
const SKILLS = ['First Aid', 'Swimming', 'Rescue Operations', 'Medical', 'Communication', 'Driving', 'Cooking', 'Logistics']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function VolunteerManagement() {
  const { logout } = useAuth()
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterApproved, setFilterApproved] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', blood_group: '', skills: [], district: '', availability: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadVolunteers = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterApproved === 'Approved') params.approved = true
      if (filterApproved === 'Pending') params.approved = false
      const res = await api.get('/volunteers/', { params })
      setVolunteers(res.data.items || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadVolunteers() }, [search, filterStatus, filterApproved])

  const approve = async (id) => {
    try {
      await api.patch(`/volunteers/${id}/approve`)
      toast.success('Volunteer approved!')
      loadVolunteers()
    } catch (err) {
      const status = err.response?.status
      if (status === 403) {
        toast.error('Session mismatch — signing out. Please log back in.', { duration: 5000 })
        setTimeout(() => { logout(); window.location.href = '/login' }, 1500)
      } else {
        toast.error(err.response?.data?.detail || `Approval failed (${status || 'network error'})`)
      }
    }
  }

  const reject = async (id) => {
    try {
      await api.patch(`/volunteers/${id}/reject`)
      toast.success('Volunteer rejected')
      loadVolunteers()
    } catch (err) {
      const status = err.response?.status
      if (status === 403) {
        toast.error('Session mismatch — signing out. Please log back in.', { duration: 5000 })
        setTimeout(() => { logout(); window.location.href = '/login' }, 1500)
      } else {
        toast.error(err.response?.data?.detail || `Failed to reject (${status || 'network error'})`)
      }
    }
  }

  const deactivate = async (id) => {
    try {
      await api.patch(`/volunteers/${id}/deactivate`)
      toast.success('Volunteer deactivated')
      loadVolunteers()
    } catch (err) {
      const status = err.response?.status
      if (status === 403) {
        toast.error('Session mismatch — signing out. Please log back in.', { duration: 5000 })
        setTimeout(() => { logout(); window.location.href = '/login' }, 1500)
      } else {
        toast.error(err.response?.data?.detail || `Failed to deactivate (${status || 'network error'})`)
      }
    }
  }

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.phone) return toast.error('Fill required fields')
    setSubmitting(true)
    try {
      await api.post('/volunteers/', form)
      toast.success('Volunteer added!')
      setAddModal(false)
      setForm({ name: '', email: '', phone: '', blood_group: '', skills: [], district: '', availability: '' })
      loadVolunteers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add volunteer')
    }
    setSubmitting(false)
  }

  const toggleSkill = (skill) => {
    setForm(p => ({
      ...p,
      skills: p.skills.includes(skill) ? p.skills.filter(s => s !== skill) : [...p.skills, skill]
    }))
  }

  const total = volunteers.length
  const approved = volunteers.filter(v => v.approved).length
  const pending = volunteers.filter(v => !v.approved && v.status !== 'Rejected').length
  const active = volunteers.filter(v => v.status === 'Active').length

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="page-title">Volunteer Management</h1>
            <p className="text-gray-500 text-sm">{total} registered • {pending} pending approval</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadVolunteers} className="btn-secondary text-sm py-2 px-3"><RefreshCw size={14} /></button>
            <button onClick={() => setAddModal(true)} className="btn-primary text-sm">
              <Plus size={16} />
              Add Volunteer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Volunteers" value={total} color="primary" />
          <StatCard icon={CheckCircle} label="Approved" value={approved} color="success" />
          <StatCard icon={Users} label="Active" value={active} color="cyan" />
          <StatCard icon={Filter} label="Pending Review" value={pending} color="warning" />
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-2 text-sm" placeholder="Search volunteers..." />
            </div>
            <select value={filterApproved} onChange={e => setFilterApproved(e.target.value)} className="input py-2 text-sm w-auto">
              {['All', 'Approved', 'Pending'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input py-2 text-sm w-auto">
              {['All', 'Active', 'Inactive', 'Pending'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? <PageLoader /> : (
          <div className="space-y-3">
            {volunteers.length === 0 ? (
              <div className="card p-12 text-center">
                <Users size={40} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No volunteers found</p>
              </div>
            ) : volunteers.map((vol, i) => (
              <motion.div
                key={vol.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg ${vol.approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {vol.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{vol.name}</span>
                          <StatusBadge status={vol.approved ? 'Approved' : vol.status === 'Rejected' ? 'Rejected' : 'Pending'} />
                          <StatusBadge status={vol.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1"><Phone size={11} /> {vol.phone}</span>
                          <span className="flex items-center gap-1"><MapPin size={11} /> {vol.district}</span>
                          <span className="flex items-center gap-1"><Heart size={11} /> {vol.blood_group}</span>
                          <span className="flex items-center gap-1"><Briefcase size={11} /> {vol.availability}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {vol.skills?.slice(0, 4).map(skill => (
                            <span key={skill} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{skill}</span>
                          ))}
                          {vol.skills?.length > 4 && <span className="text-xs text-gray-400">+{vol.skills.length - 4} more</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!vol.approved && vol.status !== 'Rejected' && (
                          <>
                            <button onClick={() => approve(vol.id)} className="btn-success text-xs py-1.5 px-3">
                              <CheckCircle size={12} />
                              Approve
                            </button>
                            <button onClick={() => reject(vol.id)} className="btn-danger text-xs py-1.5 px-3">
                              <X size={12} />
                              Reject
                            </button>
                          </>
                        )}
                        {vol.approved && vol.status === 'Active' && (
                          <button onClick={() => deactivate(vol.id)} className="btn-secondary text-xs py-1.5 px-3">
                            <UserX size={12} />
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Register New Volunteer" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="Full name" />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input" placeholder="10-digit number" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input" placeholder="email@example.com" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Blood Group</label>
              <select value={form.blood_group} onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))} className="input">
                <option value="">Select</option>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">District</label>
              <select value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} className="input">
                <option value="">Select</option>
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Availability</label>
              <select value={form.availability} onChange={e => setForm(p => ({ ...p, availability: e.target.value }))} className="input">
                <option value="">Select</option>
                {['Full Time', 'Part Time', 'Weekends', 'On Call'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${form.skills.includes(skill) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
              Add Volunteer
            </button>
            <button onClick={() => setAddModal(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

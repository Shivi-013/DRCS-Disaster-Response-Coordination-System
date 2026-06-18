import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, Plus, Search, RefreshCw, Trash2, CheckCircle, AlertCircle, Wrench, Bell, X, MapPin } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { StatusBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Modal from '../../components/common/Modal'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const CATEGORIES = ['All', 'Boats', 'Medical', 'Fire', 'Supply', 'Power', 'Water', 'Air']
const RESOURCE_TYPES = ['Rescue Boat', 'Ambulance', 'Fire Truck', 'Medical Kit', 'Food Truck', 'Generator', 'Water Pump', 'Helicopter', 'Police Vehicle', 'Tent']
const DISTRICTS = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali']

const statusIcons = { Available: CheckCircle, Assigned: AlertCircle, Maintenance: Wrench }

export default function ResourceManagement() {
  const [tab, setTab] = useState('resources')
  const [resources, setResources] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [addModal, setAddModal] = useState(false)
  const [stats, setStats] = useState({})
  const [form, setForm] = useState({ name: '', type: '', category: '', district: '', quantity: 1 })
  const [submitting, setSubmitting] = useState(false)
  const [reviewing, setReviewing] = useState(null)

  const loadResources = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus !== 'All') params.status = filterStatus
      if (search) params.search = search
      const res = await api.get('/resources/', { params })
      setResources(res.data.items || [])
      setStats(res.data.stats || {})
    } catch {}
    setLoading(false)
  }

  const loadRequests = async () => {
    setRequestsLoading(true)
    try {
      const res = await api.get('/resource-requests/')
      setRequests(res.data.items || [])
    } catch {}
    setRequestsLoading(false)
  }

  useEffect(() => { loadResources() }, [filterStatus, search])
  useEffect(() => { if (tab === 'requests') loadRequests() }, [tab])

  const filtered = filterCategory === 'All' ? resources : resources.filter(r => r.category === filterCategory)

  const handleAdd = async () => {
    if (!form.name || !form.type) return toast.error('Fill required fields')
    setSubmitting(true)
    try {
      await api.post('/resources/', form)
      toast.success('Resource added!')
      setAddModal(false)
      setForm({ name: '', type: '', category: '', district: '', quantity: 1 })
      loadResources()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add resource')
    }
    setSubmitting(false)
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/resources/${id}/status`, { status })
      toast.success('Status updated')
      loadResources()
    } catch { toast.error('Failed to update') }
  }

  const deleteResource = async (id) => {
    if (!confirm('Delete this resource?')) return
    try {
      await api.delete(`/resources/${id}`)
      toast.success('Resource deleted')
      loadResources()
    } catch { toast.error('Delete failed') }
  }

  const reviewRequest = async (id, action) => {
    setReviewing(id + action)
    try {
      await api.patch(`/resource-requests/${id}/${action}`)
      toast.success(action === 'approve' ? 'Request approved!' : 'Request denied.')
      loadRequests()
    } catch { toast.error('Failed to review') }
    setReviewing(null)
  }

  const pendingCount = requests.filter(r => r.status === 'Pending').length

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="page-title">Resource Management</h1>
            <p className="text-gray-500 text-sm">{resources.length} resources tracked</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadResources(); loadRequests() }} className="btn-secondary text-sm py-2 px-3"><RefreshCw size={14} /></button>
            <button onClick={() => setAddModal(true)} className="btn-primary text-sm">
              <Plus size={16} /> Add Resource
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Total Resources" value={stats.total ?? 0} color="primary" />
          <StatCard icon={CheckCircle} label="Available" value={stats.available ?? 0} color="success" />
          <StatCard icon={AlertCircle} label="Assigned" value={stats.assigned ?? 0} color="primary" />
          <StatCard icon={Wrench} label="Maintenance" value={stats.maintenance ?? 0} color="warning" />
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          <button onClick={() => setTab('resources')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'resources' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Resources
          </button>
          <button onClick={() => setTab('requests')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${tab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Volunteer Requests
            {pendingCount > 0 && <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
          </button>
        </div>

        {tab === 'resources' && (
          <>
            <div className="card p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-2 text-sm" placeholder="Search resources..." />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input py-2 text-sm w-auto">
                  {['All', 'Available', 'Assigned', 'Maintenance'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input py-2 text-sm w-auto">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {loading ? <PageLoader /> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((resource, i) => {
                  const StatusIcon = statusIcons[resource.status] || Package
                  return (
                    <motion.div key={resource.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Package size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{resource.name}</p>
                            <p className="text-xs text-gray-500">{resource.type}</p>
                          </div>
                        </div>
                        <StatusBadge status={resource.status} />
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                        <div className="flex justify-between"><span>District</span><span className="font-medium text-gray-700">{resource.district}</span></div>
                        <div className="flex justify-between"><span>Category</span><span className="font-medium text-gray-700">{resource.category}</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={resource.status} onChange={e => updateStatus(resource.id, e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 flex-1 bg-white cursor-pointer hover:border-primary-300">
                          {['Available', 'Assigned', 'Maintenance'].map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button onClick={() => deleteResource(resource.id)} className="p-1.5 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full card p-12 text-center">
                    <Package size={40} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No resources found</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {requestsLoading ? <PageLoader /> : requests.length === 0 ? (
              <div className="card p-12 text-center">
                <Bell size={40} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No resource requests yet</p>
                <p className="text-xs text-gray-400 mt-1">Volunteers submit requests from the Open Incidents page</p>
              </div>
            ) : requests.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`card p-4 border-l-4 ${req.status === 'Pending' ? 'border-l-orange-400' : req.status === 'Approved' ? 'border-l-green-400' : 'border-l-red-400'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900">{req.resource_type}</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">×{req.quantity}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        req.urgency === 'Critical' ? 'bg-red-100 text-red-700' :
                        req.urgency === 'High' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'}`}>{req.urgency} urgency</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Denied' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">Requested by <span className="font-semibold">{req.requested_by_name}</span></p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {req.incident_type} · {req.incident_district} · {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </p>
                    {req.notes && <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg p-2 italic">"{req.notes}"</p>}
                    {req.reviewed_by && <p className="text-xs text-gray-400 mt-1">Reviewed by {req.reviewed_by}</p>}
                  </div>
                  {req.status === 'Pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => reviewRequest(req.id, 'deny')}
                        disabled={reviewing === req.id + 'deny'}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm transition-colors disabled:opacity-50"
                      >
                        <X size={13} /> Deny
                      </button>
                      <button
                        onClick={() => reviewRequest(req.id, 'approve')}
                        disabled={reviewing === req.id + 'approve'}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                      >
                        {reviewing === req.id + 'approve' ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={13} />}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add New Resource" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Resource Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Rescue Boat 04" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Resource Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input">
                <option value="">Select type</option>
                {RESOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
                <option value="">Select category</option>
                {['Boats', 'Medical', 'Fire', 'Supply', 'Power', 'Water', 'Air'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">District</label>
            <select value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} className="input">
              <option value="">Select district</option>
              {DISTRICTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
              Add Resource
            </button>
            <button onClick={() => setAddModal(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

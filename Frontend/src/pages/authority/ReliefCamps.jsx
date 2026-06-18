import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Tent, Plus, Search, RefreshCw, MapPin, Users, Utensils,
  Droplets, Wrench, Edit2, Minus, AlertTriangle, Phone, BedDouble
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { StatusBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Modal from '../../components/common/Modal'
import IncidentMap from '../../components/map/IncidentMap'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const DISTRICTS = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali']
const FACILITIES_LIST = ['Medical Unit', 'Kitchen', 'Toilets', 'Generator', 'Internet', 'Water Purification', 'Children Area', 'Women Section']

function supplyIssues(camp) {
  const pct = camp.capacity > 0 ? (camp.occupied / camp.capacity) * 100 : 0
  const issues = []
  if (camp.food_stock_days === 0) issues.push({ level: 'critical', text: 'No food stock' })
  else if (camp.food_stock_days <= 2) issues.push({ level: 'warning', text: `Food: ${camp.food_stock_days}d left` })
  if (camp.water_stock_liters < 500) issues.push({ level: 'critical', text: 'Water critically low' })
  else if (camp.water_stock_liters < 2000) issues.push({ level: 'warning', text: `Water: ${camp.water_stock_liters}L` })
  if (pct >= 95) issues.push({ level: 'critical', text: 'At capacity' })
  else if (pct >= 80) issues.push({ level: 'warning', text: `${Math.round(pct)}% full` })
  return issues
}

export default function ReliefCamps() {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [campStats, setCampStats] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [adjusting, setAdjusting] = useState(null)
  const [restocking, setRestocking] = useState(null)
  const [bookingCounts, setBookingCounts] = useState({})
  const intervalRef = useRef(null)
  const defaultForm = { name: '', district: '', address: '', lat: '', lng: '', capacity: '', contact_person: '', contact_phone: '', facilities: [] }
  const [form, setForm] = useState(defaultForm)
  const [editForm, setEditForm] = useState({})

  const loadCamps = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = search ? { search } : {}
      const res = await api.get('/relief-camps/', { params })
      setCamps(res.data.items || [])
      setCampStats(res.data.stats || {})
    } catch {}
    if (!silent) setLoading(false)
  }, [search])

  const loadBookingCounts = useCallback(async (campList) => {
    if (!campList?.length) return
    const counts = {}
    await Promise.allSettled(campList.map(async (camp) => {
      try {
        const res = await api.get(`/relief-camps/${camp.id}/bookings`)
        counts[camp.id] = (res.data.items || []).filter(b => b.status === 'Active').length
      } catch { counts[camp.id] = 0 }
    }))
    setBookingCounts(counts)
  }, [])

  useEffect(() => { loadCamps() }, [loadCamps])
  useEffect(() => { if (camps.length) loadBookingCounts(camps) }, [camps, loadBookingCounts])

  useEffect(() => {
    intervalRef.current = setInterval(() => loadCamps(true), 20000)
    return () => clearInterval(intervalRef.current)
  }, [loadCamps])

  const handleAdd = async () => {
    if (!form.name || !form.district || !form.capacity) return toast.error('Fill required fields')
    setSubmitting(true)
    try {
      await api.post('/relief-camps/', { ...form, lat: parseFloat(form.lat) || 25.5, lng: parseFloat(form.lng) || 85.1, capacity: parseInt(form.capacity) })
      toast.success('Relief camp created!')
      setAddModal(false)
      setForm(defaultForm)
      loadCamps()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create camp')
    }
    setSubmitting(false)
  }

  const handleEdit = async () => {
    setSubmitting(true)
    try {
      const updates = { ...editForm }
      if (updates.occupied != null) updates.occupied = parseInt(updates.occupied)
      if (updates.capacity != null) updates.capacity = parseInt(updates.capacity)
      if (updates.medical_staff != null) updates.medical_staff = parseInt(updates.medical_staff)
      if (updates.food_stock_days != null) updates.food_stock_days = parseInt(updates.food_stock_days)
      if (updates.water_stock_liters != null) updates.water_stock_liters = parseInt(updates.water_stock_liters)
      await api.put(`/relief-camps/${editModal.id}`, updates)
      toast.success('Camp updated!')
      setEditModal(null)
      loadCamps()
    } catch {
      toast.error('Failed to update camp')
    }
    setSubmitting(false)
  }

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

  const adjustOccupancy = async (campId, delta) => {
    setAdjusting(campId + delta)
    try {
      const res = await api.patch(`/relief-camps/${campId}/occupancy`, { delta })
      setCamps(prev => prev.map(c => c.id === campId ? { ...c, ...res.data } : c))
      if (res.data.status === 'Full') toast('Camp marked as Full', { icon: '🔴' })
    } catch {
      toast.error('Failed to update occupancy')
    }
    setAdjusting(null)
  }

  const toggleFacility = (facility, isEdit = false) => {
    if (isEdit) {
      setEditForm(p => ({
        ...p,
        facilities: (p.facilities || []).includes(facility)
          ? (p.facilities || []).filter(f => f !== facility)
          : [...(p.facilities || []), facility]
      }))
    } else {
      setForm(p => ({
        ...p,
        facilities: p.facilities.includes(facility) ? p.facilities.filter(f => f !== facility) : [...p.facilities, facility]
      }))
    }
  }

  const openEdit = (camp) => {
    setEditModal(camp)
    setEditForm({
      occupied: camp.occupied,
      capacity: camp.capacity,
      medical_staff: camp.medical_staff,
      food_stock_days: camp.food_stock_days,
      water_stock_liters: camp.water_stock_liters,
      status: camp.status,
      facilities: [...(camp.facilities || [])],
      contact_person: camp.contact_person,
      contact_phone: camp.contact_phone,
    })
  }

  const occupancyColor = (camp) => {
    const pct = (camp.occupied / camp.capacity) * 100
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="page-title">Relief Camp Management</h1>
            <p className="text-gray-500 text-sm">{camps.length} camps • {campStats.total_occupied ?? 0}/{campStats.total_capacity ?? 0} occupied</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadCamps} className="btn-secondary text-sm py-2 px-3"><RefreshCw size={14} /></button>
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')} className="btn-secondary text-sm py-2 px-3">
              <MapPin size={14} />
              {viewMode === 'grid' ? 'Map View' : 'Grid View'}
            </button>
            <button onClick={() => setAddModal(true)} className="btn-primary text-sm">
              <Plus size={16} />
              Add Camp
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Tent} label="Total Camps" value={camps.length} color="primary" />
          <StatCard icon={Users} label="Total Capacity" value={campStats.total_capacity ?? 0} color="cyan" />
          <StatCard icon={Users} label="Occupied" value={campStats.total_occupied ?? 0} color="warning" />
          <StatCard icon={Tent} label="Occupancy Rate" value={`${campStats.occupancy_rate ?? 0}%`} color={campStats.occupancy_rate > 80 ? 'danger' : 'success'} />
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-2 text-sm" placeholder="Search camps..." />
        </div>

        {loading ? <PageLoader /> : viewMode === 'map' ? (
          <IncidentMap incidents={[]} camps={camps} height="600px" showCamps={true} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {camps.map((camp, i) => {
              const occupancyPct = Math.round((camp.occupied / camp.capacity) * 100)
              const alerts = supplyIssues(camp)
              const hasCritical = alerts.some(a => a.level === 'critical')
              const hasWarning = alerts.some(a => a.level === 'warning')
              const activeBookings = bookingCounts[camp.id] ?? 0
              return (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`card p-5 ${hasCritical ? 'border-l-4 border-l-red-500' : hasWarning ? 'border-l-4 border-l-orange-400' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{camp.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {camp.district}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeBookings > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                          <BedDouble size={10} /> {activeBookings} booked
                        </span>
                      )}
                      <StatusBadge status={camp.status} />
                      <button onClick={() => openEdit(camp)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Supply alert badges + Restock */}
                  {alerts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {alerts.map((alert, idx) => (
                        <span key={idx} className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${alert.level === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          <AlertTriangle size={9} /> {alert.text}
                        </span>
                      ))}
                      <button
                        onClick={() => handleRestock(camp.id)}
                        disabled={restocking === camp.id}
                        className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                      >
                        {restocking === camp.id
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <RefreshCw size={11} />}
                        Restock
                      </button>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Occupancy</span>
                      <span className="font-semibold">{camp.occupied}/{camp.capacity} ({occupancyPct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${occupancyColor(camp)}`} style={{ width: `${Math.min(100, occupancyPct)}%` }} />
                    </div>
                  </div>

                  {/* Inline occupancy counter */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mb-3">
                    <span className="text-xs text-gray-500 font-medium">Quick Adjust</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustOccupancy(camp.id, -1)}
                        disabled={adjusting === camp.id + -1 || camp.occupied <= 0}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-600 disabled:opacity-40 transition-colors shadow-sm"
                      >
                        {adjusting === camp.id + -1
                          ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                          : <Minus size={12} />}
                      </button>
                      <span className="text-sm font-bold text-gray-900 w-8 text-center">{camp.occupied}</span>
                      <button
                        onClick={() => adjustOccupancy(camp.id, 1)}
                        disabled={adjusting === camp.id + 1 || camp.occupied >= camp.capacity}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-green-50 hover:border-green-200 text-gray-600 hover:text-green-600 disabled:opacity-40 transition-colors shadow-sm"
                      >
                        {adjusting === camp.id + 1
                          ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                          : <Plus size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { icon: Users, label: 'Staff', value: camp.medical_staff ?? 0, alert: false },
                      { icon: Utensils, label: 'Food (days)', value: camp.food_stock_days ?? 0, alert: camp.food_stock_days <= 2 },
                      { icon: Droplets, label: 'Water (L)', value: camp.water_stock_liters?.toLocaleString() ?? 0, alert: camp.water_stock_liters < 2000 },
                    ].map(({ icon: Icon, label, value, alert }) => (
                      <div key={label} className={`rounded-xl p-2 text-center ${alert ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <Icon size={14} className={alert ? 'text-orange-500 mx-auto mb-1' : 'text-gray-400 mx-auto mb-1'} />
                        <p className={`font-bold text-sm ${alert ? 'text-orange-700' : 'text-gray-900'}`}>{value}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  {camp.facilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {camp.facilities.slice(0, 3).map(f => (
                        <span key={f} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                      {camp.facilities.length > 3 && <span className="text-xs text-gray-400">+{camp.facilities.length - 3}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span><span className="font-medium">Contact:</span> {camp.contact_person}</span>
                    {camp.contact_phone && (
                      <a href={`tel:${camp.contact_phone}`} className="flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold">
                        <Phone size={11} /> {camp.contact_phone}
                      </a>
                    )}
                  </div>
                </motion.div>
              )
            })}

            {camps.length === 0 && (
              <div className="col-span-full card p-12 text-center">
                <Tent size={40} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No relief camps found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Create Relief Camp" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Camp Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Patna Relief Center" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">District *</label>
              <select value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} className="input">
                <option value="">Select district</option>
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Capacity *</label>
              <input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className="input" placeholder="Max occupants" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="input" placeholder="Full address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} className="input" placeholder="e.g. 25.5941" />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input type="number" step="any" value={form.lng} onChange={e => setForm(p => ({ ...p, lng: e.target.value }))} className="input" placeholder="e.g. 85.1376" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} className="input" placeholder="Camp manager name" />
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className="input" placeholder="Phone number" />
            </div>
          </div>
          <div>
            <label className="label">Facilities</label>
            <div className="flex flex-wrap gap-2">
              {FACILITIES_LIST.map(f => (
                <button key={f} type="button" onClick={() => toggleFacility(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${form.facilities.includes(f) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
              Create Camp
            </button>
            <button onClick={() => setAddModal(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Update: ${editModal?.name}`} size="md">
        {editModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Occupied (current)</label>
                <input type="number" value={editForm.occupied ?? ''} onChange={e => setEditForm(p => ({ ...p, occupied: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Capacity</label>
                <input type="number" value={editForm.capacity ?? ''} onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Medical Staff</label>
                <input type="number" value={editForm.medical_staff ?? ''} onChange={e => setEditForm(p => ({ ...p, medical_staff: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Food Stock (days)</label>
                <input type="number" value={editForm.food_stock_days ?? ''} onChange={e => setEditForm(p => ({ ...p, food_stock_days: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Water Stock (liters)</label>
                <input type="number" value={editForm.water_stock_liters ?? ''} onChange={e => setEditForm(p => ({ ...p, water_stock_liters: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={editForm.status ?? ''} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className="input">
                  {['Active', 'Full', 'Closed'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input value={editForm.contact_person ?? ''} onChange={e => setEditForm(p => ({ ...p, contact_person: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input value={editForm.contact_phone ?? ''} onChange={e => setEditForm(p => ({ ...p, contact_phone: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Facilities</label>
              <div className="flex flex-wrap gap-2">
                {FACILITIES_LIST.map(f => (
                  <button key={f} type="button" onClick={() => toggleFacility(f, true)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${(editForm.facilities || []).includes(f) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleEdit} disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wrench size={16} />}
                Update Camp
              </button>
              <button onClick={() => setEditModal(null)} className="btn-secondary px-4">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

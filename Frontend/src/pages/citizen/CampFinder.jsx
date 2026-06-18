import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tent, MapPin, Users, Utensils, Droplets, Phone, Search,
  RefreshCw, CheckCircle, AlertTriangle, BedDouble, X,
  CalendarCheck, Wifi
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/common/Modal'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { api } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const DISTRICTS = ['All Districts', 'Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali']
const REFRESH_INTERVAL = 20000

function OccupancyBar({ occupied, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-green-500'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Occupancy</span>
        <span className="font-semibold text-gray-700">{occupied}/{capacity} ({pct}% full)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CampFinder() {
  const [camps, setCamps] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('All Districts')
  const [showFull, setShowFull] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [bookModal, setBookModal] = useState(null) // camp object
  const [beds, setBeds] = useState(1)
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const intervalRef = useRef(null)

  const loadCamps = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (district !== 'All Districts') params.district = district
      const [campsRes, bookingsRes] = await Promise.all([
        api.get('/relief-camps/', { params }),
        api.get('/relief-camps/my-bookings'),
      ])
      setCamps(campsRes.data.items || [])
      setMyBookings(bookingsRes.data.items || [])
      setLastUpdated(new Date())
    } catch {}
    if (!silent) setLoading(false)
  }, [search, district])

  useEffect(() => {
    loadCamps()
    intervalRef.current = setInterval(() => loadCamps(true), REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [loadCamps])

  const openBookModal = (camp) => {
    setBookModal(camp)
    setBeds(1)
    setNotes('')
  }

  const handleBook = async () => {
    if (!bookModal) return
    if (beds < 1 || beds > bookModal.beds_available) return toast.error(`Enter a number between 1 and ${bookModal.beds_available}`)
    setBooking(true)
    try {
      const res = await api.post(`/relief-camps/${bookModal.id}/book`, { beds: Number(beds), notes })
      toast.success(`${beds} bed${beds > 1 ? 's' : ''} booked at ${bookModal.name}!`)
      setCamps(prev => prev.map(c => c.id === bookModal.id ? res.data.camp : c))
      setMyBookings(prev => [res.data.booking, ...prev])
      setBookModal(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed')
    }
    setBooking(false)
  }

  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this booking? The beds will be released back to the camp.')) return
    setCancelling(bookingId)
    try {
      const res = await api.patch(`/relief-camps/cancel-booking/${bookingId}`)
      toast.success(`Booking cancelled — ${res.data.beds_released} bed${res.data.beds_released !== 1 ? 's' : ''} released`)
      setMyBookings(prev => prev.filter(b => b.id !== bookingId))
      loadCamps(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancellation failed')
    }
    setCancelling(null)
  }

  const visible = camps
    .filter(c => c.status !== 'Closed')
    .filter(c => showFull || c.status !== 'Full')
    .sort((a, b) => (b.beds_available ?? 0) - (a.beds_available ?? 0))

  const availableCount = camps.filter(c => c.status === 'Active').length
  const totalBeds = camps.reduce((s, c) => s + (c.beds_available ?? 0), 0)

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Tent size={24} className="text-primary-600" />
              Find & Book Relief Camp
            </h1>
            <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
              {availableCount} active camp{availableCount !== 1 ? 's' : ''} · {totalBeds.toLocaleString()} beds available
              {lastUpdated && (
                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <Wifi size={10} /> Live · updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              )}
            </p>
          </div>
          <button onClick={() => loadCamps()} className="btn-secondary text-sm py-2 px-3">
            <RefreshCw size={14} /> Refresh
          </button>
        </motion.div>

        {/* My Bookings */}
        <AnimatePresence>
          {myBookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card p-4 border-l-4 border-l-green-500 bg-green-50"
            >
              <div className="flex items-center gap-2 mb-3">
                <CalendarCheck size={16} className="text-green-700" />
                <h2 className="font-bold text-green-800 text-sm">Your Active Bookings ({myBookings.length})</h2>
              </div>
              <div className="space-y-2">
                {myBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BedDouble size={16} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{b.camp_name}</p>
                        <p className="text-xs text-gray-500">
                          {b.beds_booked} bed{b.beds_booked !== 1 ? 's' : ''} · {b.camp_district} · booked {formatDistanceToNow(new Date(b.booked_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {b.camp_phone && (
                        <a href={`tel:${b.camp_phone}`} className="text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-green-700">
                          <Phone size={11} /> Call
                        </a>
                      )}
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelling === b.id}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {cancelling === b.id
                          ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <X size={11} />}
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 py-2 text-sm"
              placeholder="Search camps by name..."
            />
          </div>
          <select
            value={district}
            onChange={e => setDistrict(e.target.value)}
            className="input py-2 text-sm w-auto"
          >
            {DISTRICTS.map(d => <option key={d}>{d}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer bg-white border border-gray-200 rounded-2xl px-3 py-2 select-none">
            <input type="checkbox" checked={showFull} onChange={e => setShowFull(e.target.checked)} className="rounded" />
            Show full camps
          </label>
        </div>

        {/* Camp list */}
        {loading ? <PageLoader /> : visible.length === 0 ? (
          <div className="card p-14 text-center">
            <Tent size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">No available camps found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different district or enable "Show full camps"</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((camp, i) => {
              const isFull = camp.status === 'Full'
              const bedsAvail = camp.beds_available ?? 0
              const myBookingHere = myBookings.find(b => b.camp_id === camp.id)
              return (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`card p-5 flex flex-col gap-4 ${myBookingHere ? 'ring-2 ring-green-400' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{camp.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {camp.address || camp.district}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      isFull ? 'bg-red-100 text-red-700' :
                      bedsAvail > 50 ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {isFull ? 'FULL' : `${bedsAvail} beds free`}
                    </span>
                  </div>

                  {/* My booking badge */}
                  {myBookingHere && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-green-700">
                        You have {myBookingHere.beds_booked} bed{myBookingHere.beds_booked !== 1 ? 's' : ''} booked here
                      </span>
                    </div>
                  )}

                  {/* Occupancy bar */}
                  <OccupancyBar occupied={camp.occupied} capacity={camp.capacity} />

                  {/* Supply info */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: Users, label: 'Staff', value: camp.medical_staff ?? 0 },
                      { icon: Utensils, label: 'Food', value: `${camp.food_stock_days ?? 0}d` },
                      { icon: Droplets, label: 'Water', value: camp.water_stock_liters ? `${(camp.water_stock_liters / 1000).toFixed(1)}kL` : '—' },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
                        <Icon size={13} className="text-gray-400 mx-auto mb-0.5" />
                        <p className="font-bold text-gray-900 text-sm">{value}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Facilities */}
                  {camp.facilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {camp.facilities.map(f => (
                        <span key={f} className="flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                          <CheckCircle size={9} /> {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contact + Book */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Camp Manager</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{camp.contact_person || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {camp.contact_phone && (
                        <a href={`tel:${camp.contact_phone}`} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
                          <Phone size={13} /> Call
                        </a>
                      )}
                      {!isFull && bedsAvail > 0 && (
                        <button
                          onClick={() => openBookModal(camp)}
                          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                        >
                          <BedDouble size={14} /> Book
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Warning if near full */}
                  {!isFull && bedsAvail <= 20 && bedsAvail > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-semibold rounded-xl px-3 py-2">
                      <AlertTriangle size={13} />
                      Only {bedsAvail} bed{bedsAvail !== 1 ? 's' : ''} left — filling up fast!
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Book Beds Modal */}
      <Modal open={!!bookModal} onClose={() => setBookModal(null)} title={`Book Beds — ${bookModal?.name}`} size="sm">
        {bookModal && (
          <div className="space-y-5">
            <div className="bg-primary-50 rounded-2xl p-4 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-primary-800">
                <MapPin size={13} /> <span>{bookModal.address || bookModal.district}</span>
              </div>
              <div className="flex items-center gap-2 text-primary-800">
                <BedDouble size={13} /> <span className="font-bold">{bookModal.beds_available} beds currently available</span>
              </div>
              {bookModal.contact_phone && (
                <div className="flex items-center gap-2 text-primary-800">
                  <Phone size={13} /> <span>{bookModal.contact_phone}</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Number of Beds *</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBeds(b => Math.max(1, b - 1))}
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50 text-gray-700 transition-colors"
                >−</button>
                <input
                  type="number"
                  min={1}
                  max={Math.min(50, bookModal.beds_available)}
                  value={beds}
                  onChange={e => setBeds(Math.max(1, Math.min(bookModal.beds_available, parseInt(e.target.value) || 1)))}
                  className="input text-center text-xl font-bold py-2 w-20"
                />
                <button
                  type="button"
                  onClick={() => setBeds(b => Math.min(bookModal.beds_available, b + 1))}
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50 text-gray-700 transition-colors"
                >+</button>
                <span className="text-sm text-gray-500">bed{beds !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Max {Math.min(50, bookModal.beds_available)} beds per booking</p>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="input resize-none text-sm"
                placeholder="e.g. family of 4 including elderly, need ground floor"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex items-start gap-2">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>Please arrive within 24 hours of booking. You can cancel from "My Bookings" to release the beds if your plans change.</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBook}
                disabled={booking}
                className="btn-primary flex-1 justify-center"
              >
                {booking
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <BedDouble size={16} />}
                Confirm {beds} Bed{beds !== 1 ? 's' : ''}
              </button>
              <button onClick={() => setBookModal(null)} className="btn-secondary px-4">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

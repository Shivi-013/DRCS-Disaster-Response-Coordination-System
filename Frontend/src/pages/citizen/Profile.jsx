import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Save, Shield, Edit3 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const DISTRICTS = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali', 'Gaya', 'Bhagalpur', 'Munger', 'Begusarai', 'Nalanda', 'Araria', 'Madhubani', 'Other']

export default function CitizenProfile() {
  const { user, refreshUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    district: user?.district || '',
    address: user?.address || '',
  })

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.put('/auth/profile', form)
      await refreshUser()
      setEditing(false)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    }
    setLoading(false)
  }

  const roleInfo = {
    authority: { label: 'Authority / Admin', color: 'bg-primary-100 text-primary-700', icon: '🏛️', desc: 'Full access to manage incidents, resources, and volunteers' },
    volunteer: { label: 'Volunteer', color: 'bg-green-100 text-green-700', icon: '🙋', desc: 'Can view assigned incidents and update status' },
    citizen: { label: 'Citizen', color: 'bg-blue-100 text-blue-700', icon: '👤', desc: 'Can report incidents and track rescue status' },
  }

  const role = roleInfo[user?.role] || roleInfo.citizen

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              <Edit3 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-3xl">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${role.color}`}>
                  {role.icon} {role.label}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-primary-600" />
              <span className="text-sm font-semibold text-gray-700">Account Role</span>
            </div>
            <p className="text-sm text-gray-500 ml-6">{role.desc}</p>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.name} onChange={set('name')} className="input pl-9" />
                </div>
              </div>
              <div>
                <label className="label">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.phone} onChange={set('phone')} className="input pl-9" />
                </div>
              </div>
              <div>
                <label className="label">District</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select value={form.district} onChange={set('district')} className="input pl-9">
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea value={form.address} onChange={set('address')} className="input min-h-20 resize-none" placeholder="Your address" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: User, label: 'Full Name', value: user?.name },
                { icon: Mail, label: 'Email', value: user?.email },
                { icon: Phone, label: 'Phone', value: user?.phone || 'Not set' },
                { icon: MapPin, label: 'District', value: user?.district || 'Not set' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Icon size={16} className="text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Account Info */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">User ID</span>
              <span className="font-mono text-gray-700 text-xs">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Account Status</span>
              <span className="text-green-600 font-semibold">Active</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Member Since</span>
              <span className="text-gray-700">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Emergency Numbers */}
        <div className="bg-danger-50 border border-danger-100 rounded-2xl p-5">
          <h3 className="font-bold text-danger-800 mb-3">🆘 Emergency Contacts</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Disaster Helpline', number: '1077' },
              { label: 'Emergency', number: '112' },
              { label: 'Ambulance', number: '108' },
              { label: 'Police', number: '100' },
            ].map(({ label, number }) => (
              <a key={label} href={`tel:${number}`} className="flex items-center gap-2 p-3 bg-white rounded-xl hover:bg-danger-50 transition-colors">
                <span className="text-xl font-extrabold text-danger-600">{number}</span>
                <span className="text-xs text-gray-500">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

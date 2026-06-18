import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DISTRICTS = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali', 'Gaya', 'Bhagalpur', 'Munger', 'Begusarai', 'Nalanda', 'Araria', 'Madhubani', 'Other']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: searchParams.get('role') || 'citizen',
    district: '',
    address: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')

    setLoading(true)
    const { confirmPassword, ...data } = form
    const result = await register(data)
    setLoading(false)

    if (result.success) {
      const role = result.user?.role
      navigate(role === 'authority' ? '/authority' : '/citizen')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">DRCS</p>
            <p className="text-gray-400 text-xs">Disaster Response System</p>
          </div>
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-gray-500 text-sm mb-6">Join the disaster response network</p>

          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-3 gap-2">
                {['citizen', 'volunteer', 'authority'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, role }))}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-semibold capitalize transition-all ${form.role === role ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}
                  >
                    {role === 'citizen' ? '👤' : role === 'volunteer' ? '🙋' : '🏛️'} {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required value={form.name} onChange={set('name')} className="input pl-9" placeholder="Your name" />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required value={form.phone} onChange={set('phone')} className="input pl-9" placeholder="10-digit number" />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="email" value={form.email} onChange={set('email')} className="input pl-9" placeholder="you@example.com" />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    className="input pl-9 pr-9"
                    placeholder="Min 6 chars"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    className="input pl-9"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={18} />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

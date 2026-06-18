import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await login(form.email, form.password)
    setLoading(false)
    if (result.success) {
      const role = result.user?.role
      navigate(role === 'authority' ? '/authority' : '/citizen')
    }
  }

  const demoLogin = async (email) => {
    setForm({ email, password: 'password123' })
    setLoading(true)
    const result = await login(email, 'password123')
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
        className="w-full max-w-md"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input pl-9 pr-10"
                  placeholder="Your password"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400">Demo Accounts</span></div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {[
                { label: '🏛️ Authority', email: 'authority@drcs.gov.in', color: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
                { label: '👤 Citizen', email: 'citizen@drcs.gov.in', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { label: '🙋 Volunteer', email: 'volunteer@drcs.gov.in', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
              ].map(({ label, email, color }) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => demoLogin(email)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${color} flex items-center justify-between`}
                >
                  <span>{label}</span>
                  <span className="text-gray-400 font-normal">{email}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">All demo accounts use password: <strong>password123</strong></p>
            <p className="text-center text-xs text-gray-400 mt-1">Run <code className="bg-gray-100 px-1 rounded">python setup.py</code> first to create demo data</p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">Create account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

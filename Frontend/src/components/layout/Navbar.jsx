import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Menu, X, LogOut, User, ChevronDown, Shield, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import NotificationCenter from '../common/NotificationCenter'

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth()
  const { unreadCount, fetchNotifications } = useApp()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user, fetchNotifications])

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleBadge = {
    authority: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    volunteer: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    citizen: 'bg-slate-600 text-slate-300 border border-slate-500',
  }

  return (
    <header className="sticky top-0 z-40 bg-[#0d1b2e] border-b border-slate-700/60 h-16 flex items-center px-4 gap-3">
      {user && (
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
        >
          <Menu size={20} />
        </button>
      )}

      <Link to="/" className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <AlertTriangle size={16} className="text-white" />
        </div>
        <div className="hidden sm:block">
          <span className="font-bold text-white text-base">DRCS</span>
          <span className="text-slate-400 text-xs ml-1.5">Disaster Response</span>
        </div>
      </Link>

      <div className="flex-1" />

      {user ? (
        <div className="flex items-center gap-1">
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}
              className="relative p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-96 z-50"
                >
                  <NotificationCenter onClose={() => setShowNotifications(false)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">{user.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${roleBadge[user.role]}`}>
                  {user.role}
                </span>
              </div>
              <ChevronDown size={15} className="text-slate-400 hidden sm:block" />
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  <Link
                    to="/citizen/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User size={16} />
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">Sign In</Link>
          <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2 px-4 rounded-xl transition-colors flex items-center gap-1.5">Get Started</Link>
        </div>
      )}
    </header>
  )
}

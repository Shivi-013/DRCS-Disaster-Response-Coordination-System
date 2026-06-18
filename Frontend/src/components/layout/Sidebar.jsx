import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, MapPin, Users, Package,
  Tent, BarChart3, Bell, AlertTriangle, LogOut, X,
  PlusCircle, Search, User, Globe
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const citizenLinks = [
  { to: '/citizen', icon: LayoutDashboard, label: 'My Dashboard', end: true },
  { to: '/citizen/report', icon: PlusCircle, label: 'Report Incident' },
  { to: '/citizen/track', icon: Search, label: 'Track My Reports' },
  { to: '/citizen/camps', icon: Tent, label: 'Find Shelter' },
  { to: '/citizen/profile', icon: User, label: 'My Profile' },
]

const volunteerLinks = [
  { to: '/volunteer', icon: LayoutDashboard, label: 'Volunteer Dashboard', end: true },
  { to: '/volunteer/incidents', icon: Globe, label: 'Open Incidents' },
  { to: '/volunteer/track', icon: Bell, label: 'My Assignments' },
  { to: '/volunteer/camps', icon: Tent, label: 'Find Shelter' },
  { to: '/citizen/report', icon: AlertTriangle, label: 'Report Incident' },
  { to: '/citizen/profile', icon: User, label: 'My Profile' },
]

const authorityLinks = [
  { to: '/authority', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/authority/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/authority/resources', icon: Package, label: 'Resources' },
  { to: '/authority/volunteers', icon: Users, label: 'Volunteers' },
  { to: '/authority/relief-camps', icon: Tent, label: 'Relief Camps' },
  { to: '/authority/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/citizen/profile', icon: User, label: 'Profile' },
]

function NavItem({ to, icon: Icon, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-blue-500/20 text-blue-300 font-semibold'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
        )
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const links = user.role === 'authority' ? authorityLinks : user.role === 'volunteer' ? volunteerLinks : citizenLinks

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleInitial = user.name?.charAt(0)?.toUpperCase()

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d1b2e]">
      {/* Brand */}
      <div className="p-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <AlertTriangle size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">DRCS</p>
            <p className="text-slate-400 text-xs truncate">Disaster Response System</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3 mt-1">
          {user.role === 'authority' ? 'Administration' : user.role === 'volunteer' ? 'Volunteer Portal' : 'My Portal'}
        </p>
        {links.map((link) => (
          <NavItem key={link.to} {...link} onClick={onClose} />
        ))}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-slate-700/60">
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl">
          <div className="w-8 h-8 bg-blue-600/30 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-500/30">
            <span className="text-blue-300 font-bold text-sm">{roleInitial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block flex-shrink-0 border-r border-slate-700/60 bg-[#0d1b2e] overflow-hidden h-screen sticky top-0"
          >
            <div className="w-64 h-full overflow-y-auto">{sidebarContent}</div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[#0d1b2e] border-r border-slate-700/60 z-50 lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
                <span className="font-bold text-white text-sm">Menu</span>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="h-[calc(100%-60px)] overflow-y-auto">{sidebarContent}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

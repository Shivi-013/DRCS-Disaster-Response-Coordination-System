import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDistanceToNow } from 'date-fns'

const typeConfig = {
  success: { icon: CheckCircle, cls: 'text-green-500 bg-green-50' },
  error: { icon: AlertCircle, cls: 'text-red-500 bg-red-50' },
  warning: { icon: AlertTriangle, cls: 'text-yellow-500 bg-yellow-50' },
  info: { icon: Info, cls: 'text-blue-500 bg-blue-50' },
}

export default function NotificationCenter({ onClose }) {
  const { notifications, unreadCount, markNotificationRead, markAllRead, fetchNotifications } = useApp()

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const formatTime = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-96">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-gray-600" />
          <span className="font-semibold text-gray-900 text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-danger-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.info
              const Icon = config.icon
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => !notif.read && markNotificationRead(notif.id)}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/40' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${config.cls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-gray-900 leading-tight ${!notif.read ? 'font-bold' : ''}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

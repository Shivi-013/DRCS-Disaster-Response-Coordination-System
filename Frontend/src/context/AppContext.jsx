import { createContext, useContext, useState, useCallback } from 'react'
import { api } from './AuthContext'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [incidents, setIncidents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/')
      setNotifications(res.data.items || [])
      setUnreadCount(res.data.unread_count || 0)
    } catch {}
  }, [])

  const markNotificationRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }, [])

  return (
    <AppContext.Provider value={{
      incidents, setIncidents,
      notifications, setNotifications,
      unreadCount, setUnreadCount,
      sidebarOpen, setSidebarOpen,
      fetchNotifications,
      markNotificationRead,
      markAllRead,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

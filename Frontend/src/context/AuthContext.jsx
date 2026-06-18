import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('drcs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('drcs_token')
      localStorage.removeItem('drcs_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { api }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('drcs_token')
    const savedUser = localStorage.getItem('drcs_user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('drcs_token')
        localStorage.removeItem('drcs_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password })
      const { access_token, user: userData } = res.data
      localStorage.setItem('drcs_token', access_token)
      localStorage.setItem('drcs_user', JSON.stringify(userData))
      setUser(userData)
      toast.success(`Welcome back, ${userData.name}!`)
      return { success: true, user: userData }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed'
      toast.error(msg)
      return { success: false, error: msg }
    }
  }, [])

  const register = useCallback(async (data) => {
    try {
      const res = await api.post('/auth/register', data)
      const { access_token, user: userData } = res.data
      localStorage.setItem('drcs_token', access_token)
      localStorage.setItem('drcs_user', JSON.stringify(userData))
      setUser(userData)
      toast.success(`Account created! Welcome, ${userData.name}!`)
      return { success: true, user: userData }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed'
      toast.error(msg)
      return { success: false, error: msg }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('drcs_token')
    localStorage.removeItem('drcs_user')
    setUser(null)
    toast.success('Logged out successfully')
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
      localStorage.setItem('drcs_user', JSON.stringify(res.data))
      return res.data
    } catch {
      return null
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshUser, api }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

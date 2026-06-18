import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

import CitizenDashboard from './pages/citizen/CitizenDashboard'
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard'
import OpenIncidents from './pages/volunteer/OpenIncidents'
import ReportIncident from './pages/citizen/ReportIncident'
import TrackIncident from './pages/citizen/TrackIncident'
import CampFinder from './pages/citizen/CampFinder'
import CitizenProfile from './pages/citizen/Profile'

import AuthorityDashboard from './pages/authority/AuthorityDashboard'
import IncidentManagement from './pages/authority/IncidentManagement'
import ResourceManagement from './pages/authority/ResourceManagement'
import VolunteerManagement from './pages/authority/VolunteerManagement'
import ReliefCamps from './pages/authority/ReliefCamps'
import Analytics from './pages/authority/Analytics'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) {
    const redirectMap = { citizen: '/citizen', volunteer: '/volunteer', authority: '/authority' }
    return <Navigate to={redirectMap[user.role] || '/'} replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
              success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            <Route path="/volunteer" element={<ProtectedRoute roles={['volunteer']}><VolunteerDashboard /></ProtectedRoute>} />
            <Route path="/volunteer/incidents" element={<ProtectedRoute roles={['volunteer']}><OpenIncidents /></ProtectedRoute>} />
            <Route path="/citizen" element={<ProtectedRoute roles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />
            <Route path="/citizen/report" element={<ProtectedRoute roles={['citizen', 'volunteer']}><ReportIncident /></ProtectedRoute>} />
            <Route path="/citizen/track" element={<ProtectedRoute roles={['citizen', 'volunteer']}><TrackIncident /></ProtectedRoute>} />
            <Route path="/citizen/camps" element={<ProtectedRoute roles={['citizen', 'volunteer']}><CampFinder /></ProtectedRoute>} />
            <Route path="/volunteer/camps" element={<ProtectedRoute roles={['citizen', 'volunteer']}><CampFinder /></ProtectedRoute>} />
            <Route path="/volunteer/track" element={<ProtectedRoute roles={['volunteer']}><TrackIncident /></ProtectedRoute>} />
            <Route path="/citizen/profile" element={<ProtectedRoute roles={['citizen', 'volunteer', 'authority']}><CitizenProfile /></ProtectedRoute>} />

            <Route path="/authority" element={<ProtectedRoute roles={['authority']}><AuthorityDashboard /></ProtectedRoute>} />
            <Route path="/authority/incidents" element={<ProtectedRoute roles={['authority']}><IncidentManagement /></ProtectedRoute>} />
            <Route path="/authority/resources" element={<ProtectedRoute roles={['authority']}><ResourceManagement /></ProtectedRoute>} />
            <Route path="/authority/volunteers" element={<ProtectedRoute roles={['authority']}><VolunteerManagement /></ProtectedRoute>} />
            <Route path="/authority/relief-camps" element={<ProtectedRoute roles={['authority']}><ReliefCamps /></ProtectedRoute>} />
            <Route path="/authority/analytics" element={<ProtectedRoute roles={['authority']}><Analytics /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/Login'
import Register from './pages/Register'
import PatientDashboard from './pages/PatientDashboard'
import NurseDashboard from './pages/NurseDashboard'
import NurseInterview from './pages/NurseInterview'
import AdminDashboard from './pages/AdminDashboard'
import HomePage from './pages/HomePage'

// ── ProtectedRoute ────────────────────────────────────────────
function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRole && user?.role !== allowedRole) {
    const roleHome = { patient: '/patient', nurse: '/nurse', admin: '/admin' }
    return <Navigate to={roleHome[user.role] || '/'} replace />
  }

  return children
}

// ── Root redirect ─────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const roleHome = { patient: '/patient', nurse: '/nurse', admin: '/admin' }
  return <Navigate to={roleHome[user?.role] || '/login'} replace />
}

// ── App (routes) ─────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected — Patient */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRole="patient">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute allowedRole="patient">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected — Nurse */}
      <Route
        path="/nurse"
        element={
          <ProtectedRoute allowedRole="nurse">
            <NurseDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/dashboard"
        element={
          <ProtectedRoute allowedRole="nurse">
            <NurseDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/interview/:requestId"
        element={
          <ProtectedRoute allowedRole="nurse">
            <NurseInterview />
          </ProtectedRoute>
        }
      />

      {/* Protected — Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LanguageProvider>
  )
}

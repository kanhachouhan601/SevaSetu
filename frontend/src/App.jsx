import { Component, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'))
const NurseDashboard = lazy(() => import('./pages/NurseDashboard'))
const NurseInterview = lazy(() => import('./pages/NurseInterview'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const HomePage = lazy(() => import('./pages/HomePage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">Please refresh the page or sign in again.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600">
      Loading...
    </div>
  )
}

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
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/legal/:page" element={<LegalPage />} />

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
      </Suspense>
    </RouteErrorBoundary>
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

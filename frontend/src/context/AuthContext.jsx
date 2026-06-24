// src/context/AuthContext.jsx
// ──────────────────────────────────────────────────────────────
// Global auth state: user, token, login, logout, register.
// JWT stored in localStorage under key 'nc_token'.
// User object stored under 'nc_user' for quick hydration.
// ──────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

// ── Role → route map ─────────────────────────────────────────
const ROLE_HOME = {
  patient: '/patient',
  nurse:   '/nurse',
  admin:   '/admin',
}

// ── Context ──────────────────────────────────────────────────
const AuthContext = createContext(null)

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const navigate = useNavigate()

  // Hydrate from localStorage on first load
  const [user, setUser]       = useState(() => {
    try {
      const stored = localStorage.getItem('nc_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const isAuthenticated = Boolean(user && localStorage.getItem('nc_token'))

  // ── Persist helpers ────────────────────────────────────────
  const persistSession = (token, userData) => {
    localStorage.setItem('nc_token', token)
    localStorage.setItem('nc_user', JSON.stringify(userData))
    setUser(userData)
  }

  const clearSession = () => {
    localStorage.removeItem('nc_token')
    localStorage.removeItem('nc_user')
    setUser(null)
  }

  // ── login(email, password) ─────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      persistSession(data.token, data.user)
      // Role-based redirect
      const destination = ROLE_HOME[data.user.role] || '/'
      navigate(destination, { replace: true })
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please try again.'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // ── register(data) ─────────────────────────────────────────
  const register = useCallback(async (formData) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/auth/register', formData, formData instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined
      )
      persistSession(data.token, data.user)
      const destination = ROLE_HOME[data.user.role] || '/'
      navigate(destination, { replace: true })
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed. Please try again.'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // ── logout() ───────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  // ── Refresh user from /api/auth/me on mount ───────────────
  // Keeps the stored user object fresh if the server-side data changed.
  useEffect(() => {
    const token = localStorage.getItem('nc_token')
    if (!token) return
    api.get('/api/auth/me')
      .then(({ data }) => {
        const updated = data.user
        localStorage.setItem('nc_user', JSON.stringify(updated))
        setUser(updated)
      })
      .catch(() => {
        // Token invalid / expired — clear
        clearSession()
      })
  }, []) // runs once on mount

  // ── Clear error on route change ───────────────────────────
  const clearError = () => setError(null)

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    clearError,
    roleHome: user ? (ROLE_HOME[user.role] || '/') : '/',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default AuthContext

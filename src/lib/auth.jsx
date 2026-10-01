import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from './api'

const AuthCtx = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const refresh = useCallback(() => api('/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null)), [])
  useEffect(() => { refresh() }, [refresh])
  const value = {
    user, setUser, refresh,
    // `beforeSet` lets the auth pages finish their exit motion before the user state flips (and GuestOnly redirects)
    login: async (email, password, beforeSet) => { const d = await api('/auth/login', { method: 'POST', body: { email, password } }); await beforeSet?.(); setUser(d.user); return d.user },
    signup: async (form, beforeSet) => { const d = await api('/auth/signup', { method: 'POST', body: form }); await beforeSet?.(); setUser(d.user); return d.user },
    logout: async () => { await api('/auth/logout', { method: 'POST' }); setUser(null) },
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export const useAuth = () => useContext(AuthCtx)

export function RequireAuth({ children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (user === undefined) return <div className="page-loading" aria-busy="true" />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}
export function GuestOnly({ children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (user === undefined) return <div className="page-loading" aria-busy="true" />
  if (user) return <Navigate to={new URLSearchParams(loc.search).get('next') || '/dashboard'} replace />
  return children
}

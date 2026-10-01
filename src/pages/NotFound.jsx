import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

// The control panel has no route of its own: the secret path only exists on the server.
// For admin accounts we ask the server whether this URL is the panel; everyone else gets a
// normal 404 without any request being made, and the panel code is never downloaded.
const Panel = lazy(() => import('../hq/Panel'))

export default function NotFound() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [state, setState] = useState({ k: 'checking' })
  useEffect(() => {
    if (user === undefined) return
    if (!user?.isAdmin) { setState({ k: '404' }); return }
    let live = true
    api('/admin/route', { method: 'POST', body: { path: pathname } })
      .then((d) => live && setState(d.ok ? { k: 'panel', unlocked: d.unlocked } : { k: '404' }))
      .catch(() => live && setState({ k: '404' }))
    return () => { live = false }
  }, [user, pathname])

  if (state.k === 'checking') return <div className="page-loading" aria-busy="true" />
  if (state.k === 'panel') return <Suspense fallback={<div className="page-loading" aria-busy="true" />}><Panel unlocked={state.unlocked} /></Suspense>
  return (
    <main className="club" id="main"><div className="wrap locked">
      <div className="h-display">404</div>
      <p className="lede" style={{ margin: '12px auto 24px' }}>This page swung off somewhere.</p>
      <Link className="btn btn-primary" to="/">Back home</Link>
    </div></main>
  )
}

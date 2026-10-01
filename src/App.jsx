import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import { GuestOnly, RequireAuth } from './lib/auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Membership from './pages/Membership'
import Club from './pages/Club'
import Account from './pages/Account'
import NotFound from './pages/NotFound'
import { Privacy, Terms, Refunds, Accessibility, Help } from './pages/Legal'
import Dashboard from './pages/Dashboard'
import { MyTickets, TicketView } from './pages/Tickets'
import AnnouncementBar from './components/AnnouncementBar'
import Maintenance from './pages/Maintenance'
import { useSettings } from './lib/settings'
import { useAuth } from './lib/auth'
import SupportChat from './components/SupportChat'

// the 3D film (three + r3f) is split out so auth/club pages load fast
const Home = lazy(() => import('./pages/Home'))

function ScrollReset() {
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  return null
}
const DEFAULT_DESC = 'Brand New Day — the Spider-Man film destination with trailer, cast, film media, where to watch and a dedicated Fan Club.'
const META = {
  '/': ['Brand New Day', DEFAULT_DESC],
  '/login': ['Log in', 'Log in to the Brand New Day Fan Club.'],
  '/signup': ['Join the Fan Club', 'Join the Brand New Day Fan Club. Free forever, with optional paid tiers from $4.99/month.'],
  '/forgot-password': ['Forgot password', 'Reset your Brand New Day Fan Club password.'],
  '/reset-password': ['Reset password', 'Choose a new Brand New Day Fan Club password.'],
  '/membership': ['Fan Club Membership', 'Brand New Day Fan Club membership tiers in USD: Friendly Neighborhood (free), Web-Slinger $4.99, Spider-Sense $9.99 and Multiverse $19.99 a month. Compare perks.'],
  '/dashboard': ['My dashboard', 'Your personal Brand New Day Fan Club dashboard.'],
  '/help': ['Help centre', 'Answers about Brand New Day Fan Club memberships, billing, your account and watch parties, plus live chat support.'],
  '/refunds': ['Refund Policy', 'How refunds work for fan club memberships.'],
  '/accessibility': ['Accessibility', 'Our accessibility commitment and how to give feedback.'],
  '/tickets': ['My tickets', 'Your support tickets.'],
  '/club': ['Fan Club', 'Brand New Day Fan Club members area: member card, Theory Board, trivia, watch parties and more.'],
  '/account': ['Account', 'Manage your Brand New Day Fan Club account.'],
  '/privacy': ['Privacy Policy', 'How the Brand New Day website and Fan Club collect, use and protect your data.'],
  '/terms': ['Terms of Use', 'The rules for using the Brand New Day website and Fan Club.'],
}
function setMeta(sel, attr, val) { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val) }
function Meta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const [t, d] = META[pathname] || ['Not found', DEFAULT_DESC]
    const title = pathname === '/' ? t : `${t} · Brand New Day`
    document.title = title
    setMeta('meta[name="description"]', 'content', d)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', d)
    const canon = document.head.querySelector('link[rel="canonical"]')
    if (canon) canon.href = new URL(pathname, canon.href).href
    // members/auth pages shouldn't be indexed
    let robots = document.head.querySelector('meta[name="robots"]')
    const noindex = ['/club', '/account', '/dashboard', '/tickets', '/reset-password', '/forgot-password'].includes(pathname) || !META[pathname]
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots) }
    robots.content = noindex ? 'noindex' : 'index,follow'
  }, [pathname])
  return null
}

// pages that stay reachable in maintenance mode (so the admin can sign in)
const MAINT_OPEN = ['/login', '/forgot-password', '/reset-password']

export default function App() {
  const settings = useSettings()
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (settings?.site.maintenance && !user?.isAdmin && !MAINT_OPEN.includes(pathname)) {
    // signed-in admins bypass maintenance entirely (they sign in via /login, which stays open)
    if (user === undefined) return <div className="page-loading" aria-busy="true" />
    return <><Meta /><Maintenance message={settings.site.maintenanceMessage} /></>
  }
  return (
    <>
      <ScrollReset />
      <Meta />
      <AnnouncementBar />
      <Nav />
      <Suspense fallback={<div className="page-loading" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/club" element={<RequireAuth><Club /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/tickets" element={<RequireAuth><MyTickets /></RequireAuth>} />
          <Route path="/tickets/:ref" element={<TicketView />} />
          <Route path="/help" element={<Help />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <SupportChat />
    </>
  )
}

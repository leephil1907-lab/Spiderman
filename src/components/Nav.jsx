import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { SpiderBadge } from './Brand'

export default function Nav() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => setOpen(false), [loc.pathname, loc.hash])
  useEffect(() => {
    const onHome = loc.pathname === '/'
    const check = () => {
      const film = document.getElementById('film-top')
      const past = !onHome || !film || film.getBoundingClientRect().bottom < 80
      setSolid((s) => (s === past ? s : past))
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [loc.pathname])

  return (
    <header className={`nav ${solid ? 'solid' : ''}`}>
      <a href="#main" className="skip">Skip to content</a>
      <Link to="/" className="brand" aria-label="Brand New Day — home">
        <SpiderBadge size={42} />
        <span className="brand-copy"><b>BRAND NEW DAY</b><small>SPIDER-MAN</small></span>
      </Link>
      <button className="nav-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((o) => !o)}>
        {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
      </button>
      <nav id="main-nav" className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
        <Link to="/#film">The Film</Link>
        <Link to="/#cast">Cast</Link>
        <Link to="/#watch">Where to Watch</Link>
        <NavLink to="/membership">Fan Club</NavLink>
        <NavLink to="/club">Members Area</NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" className="with-ic"><LayoutDashboard size={16} strokeWidth={1.75} aria-hidden="true" />Dashboard</NavLink>
            <button className="linkish with-ic" onClick={async () => { await logout(); nav('/') }}><LogOut size={16} strokeWidth={1.75} aria-hidden="true" />Log out</button>
          </>
        ) : user === null ? (
          <>
            <NavLink to="/login">Log in</NavLink>
            <Link to="/signup" className="btn btn-primary btn-sm" style={{ color: 'var(--color-text)' }}>Join free</Link>
          </>
        ) : null}
      </nav>
    </header>
  )
}

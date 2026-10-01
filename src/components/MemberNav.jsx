import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, LifeBuoy, Settings } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { tierById } from '../../shared/tiers.js'

const TABS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/club', label: 'Club', icon: Users },
  { to: '/tickets', label: 'Support', icon: LifeBuoy },
  { to: '/account', label: 'Account', icon: Settings },
]

/** Shared member-hub bar: one consistent frame across Dashboard, Club, Support and Account. */
export default function MemberNav() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const ref = useRef(null)
  const [ink, setInk] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current?.querySelector('a.active')
    if (el) setInk({ left: el.offsetLeft, width: el.offsetWidth })
  }, [pathname])
  if (!user) return null
  const t = tierById(user.tier)
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="member-nav">
      <div className="wrap member-nav-in">
        <nav ref={ref} className="mn-tabs" aria-label="Member area">
          {TABS.map((x) => (
            <NavLink key={x.to} to={x.to} end><x.icon size={15} strokeWidth={1.75} aria-hidden="true" /><span>{x.label}</span></NavLink>
          ))}
          {ink && <i className="mn-ink" style={{ transform: `translateX(${ink.left}px)`, width: ink.width }} aria-hidden="true" />}
        </nav>
        <div className="mn-me" title={`Member ${user.memberNo}`}>
          <span className={`mn-avatar tier-${t.id}`} aria-hidden="true">{initials}</span>
          <span className="mn-me-t"><b>{user.name.split(' ')[0]}</b><small>{t.name}</small></span>
        </div>
      </div>
    </div>
  )
}

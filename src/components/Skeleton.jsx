import { useLocation } from 'react-router-dom'

/** Shimmer block. Purely visual; the wrapper carries aria-busy + a live label. */
export function Bone({ w = '100%', h = 14, r = 8, style, className = '' }) {
  return <span className={`bone ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function Shell({ children, label = 'Loading', className = '' }) {
  return (
    <div className={`skel ${className}`} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  )
}

function Lines({ n = 3, last = '60%' }) {
  return <div className="skel-lines">{Array.from({ length: n }, (_, i) => <Bone key={i} w={i === n - 1 ? last : '100%'} />)}</div>
}

/* Home: mirrors the sticky film stage so the 3D film fades in over the same frame. */
export function HomeSkeleton() {
  return (
    <Shell label="Loading the film" className="skel-home">
      <div className="skel-stage">
        <div className="skel-glow" />
        <svg className="skel-fig" viewBox="0 0 100 270" aria-hidden="true">
          <defs><linearGradient id="skf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e0202b" stopOpacity=".55" /><stop offset="1" stopColor="#e0202b" stopOpacity=".08" /></linearGradient></defs>
          <path fill="url(#skf)" d="M50 4c9 0 15 8 15 18s-6 19-15 19-15-9-15-19S41 4 50 4Zm-22 44c6-4 14-6 22-6s16 2 22 6c8 5 10 14 12 26l6 44c1 5-2 8-6 8s-6-3-7-7l-6-36-2 46 4 70c0 7-3 11-9 11-5 0-8-4-9-10l-5-62-5 62c-1 6-4 10-9 10-6 0-9-4-9-11l4-70-2-46-6 36c-1 4-3 7-7 7s-7-3-6-8l6-44c2-12 4-21 12-26Z" />
        </svg>
        <div className="skel-title">BRAND NEW DAY</div>
        <div className="skel-hint"><span />Loading the film</div>
      </div>
    </Shell>
  )
}

export function AuthSkeleton() {
  return (
    <Shell label="Loading" className="skel-auth">
      <div className="skel-auth-art"><div className="skel-glow" /></div>
      <div className="skel-auth-main">
        <div className="skel-auth-card">
          <Bone w="55%" h={38} r={10} />
          <Bone w="85%" h={14} style={{ marginTop: 14 }} />
          <div style={{ marginTop: 30, display: 'grid', gap: 22 }}>
            {[0, 1].map((i) => <div key={i} style={{ display: 'grid', gap: 8 }}><Bone w="28%" h={12} /><Bone h={46} r={12} /></div>)}
            <Bone h={46} r={999} />
          </div>
        </div>
      </div>
    </Shell>
  )
}

function MemberBar() {
  return <div className="skel-mnav"><div className="wrap" style={{ display: 'flex', gap: 22, alignItems: 'center', minHeight: 54 }}>{[70, 50, 66, 64].map((w, i) => <Bone key={i} w={w} h={12} />)}<span style={{ flex: 1 }} /><Bone w={34} h={34} r={999} /></div></div>
}

export function DashboardSkeleton() {
  return (
    <Shell label="Loading your dashboard" className="skel-page">
      <MemberBar />
      <div className="wrap">
        <div className="skel-card skel-hero"><Bone w={120} h={11} /><Bone w="min(420px, 80%)" h={40} r={10} style={{ marginTop: 14 }} /><Bone w="min(320px, 60%)" h={14} style={{ marginTop: 12 }} /><div style={{ display: 'flex', gap: 10, marginTop: 20 }}><Bone w={150} h={36} r={999} /><Bone w={130} h={36} r={999} /></div></div>
        <div className="skel-grid">
          <div className="skel-card span-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'center' }}>
            <Bone h={0} r={18} className="skel-member-card" />
            <div style={{ display: 'grid', gap: 12 }}><Bone w="50%" h={22} r={999} /><Lines n={2} /><Bone h={90} r={12} /></div>
          </div>
          <div className="skel-card"><Bone w="45%" h={18} /><Bone h={6} r={99} style={{ margin: '16px 0 18px' }} />{[0, 1, 2, 3].map((i) => <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}><Bone w={18} h={18} r={99} /><Bone w={`${70 - i * 8}%`} /></div>)}</div>
          <div className="skel-stats span-3">{[0, 1, 2, 3].map((i) => <div key={i}><Bone w={18} h={18} r={6} /><Bone w="40%" h={34} r={8} style={{ marginTop: 14 }} /><Bone w="60%" h={12} style={{ marginTop: 10 }} /></div>)}</div>
          <div className="skel-card span-2"><Bone w="35%" h={18} /><Lines n={3} /></div>
          <div className="skel-card"><Bone w="40%" h={18} /><Lines n={4} last="80%" /></div>
        </div>
      </div>
    </Shell>
  )
}

export function ClubSkeleton() {
  return (
    <Shell label="Loading the club" className="skel-page">
      <MemberBar />
      <div className="wrap">
        <Bone w={110} h={11} /><Bone w="min(300px, 70%)" h={44} r={10} style={{ marginTop: 14 }} />
        <div style={{ display: 'flex', gap: 10, margin: '26px 0', flexWrap: 'wrap' }}>{[96, 104, 70, 112, 98, 108].map((w, i) => <Bone key={i} w={w} h={34} r={999} />)}</div>
        <div className="skel-grid">{[0, 1, 2].map((i) => <div key={i} className="skel-card"><Bone w="60%" h={18} /><Lines n={3} /></div>)}</div>
      </div>
    </Shell>
  )
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="skel-list" role="status" aria-busy="true"><span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skel-row"><Bone w={34} h={34} r={10} /><div style={{ flex: 1, display: 'grid', gap: 8 }}><Bone w={`${78 - i * 9}%`} /><Bone w="34%" h={11} /></div><Bone w={70} h={22} r={999} /></div>)}
    </div>
  )
}

export function GenericSkeleton() {
  return (
    <Shell className="skel-page">
      <div className="wrap" style={{ maxWidth: 860 }}><Bone w={110} h={11} /><Bone w="min(420px, 80%)" h={44} r={10} style={{ marginTop: 14 }} /><div style={{ marginTop: 28 }}><Lines n={4} /></div><div className="skel-card" style={{ marginTop: 28 }}><Lines n={5} last="45%" /></div></div>
    </Shell>
  )
}

/** Picks the skeleton that matches the route being loaded. */
export function RouteSkeleton() {
  const { pathname } = useLocation()
  if (pathname === '/') return <HomeSkeleton />
  if (['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname)) return <AuthSkeleton />
  if (pathname === '/dashboard') return <DashboardSkeleton />
  if (pathname === '/club' || pathname === '/account') return <ClubSkeleton />
  return <GenericSkeleton />
}

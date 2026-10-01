import { useLocation } from 'react-router-dom'
import { MarvelLogo, SpiderMark } from './Brand'

export default function AuthLayout({ children, line1 = 'Hold on.', line2 = 'Let go.' }) {
  const { pathname } = useLocation()
  const page = pathname === '/signup' ? 'signup' : pathname === '/login' ? 'login' : 'other'

  return (
    <main className={`auth auth-${page}`} id="main" data-auth-page={page}>
      <div className="auth-art" aria-hidden="true">
        <SpiderMark size={620} className="auth-emblem" />
        <div className="auth-logo"><MarvelLogo height={26} /></div>
        <img className="auth-spider" src="/plate.png" alt="" />
        <div className="quote">{line1}<br /><span>{line2}</span></div>
      </div>
      <div className="auth-main">
        <div className="auth-card">{children}</div>
      </div>
    </main>
  )
}

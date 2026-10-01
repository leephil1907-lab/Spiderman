import { Link } from 'react-router-dom'
import { Mail, MessageCircle, Clock, Lock, Building2 } from 'lucide-react'
import { siVisa, siMastercard, siAmericanexpress, siApplepay, siGooglepay } from 'simple-icons'
import { SpiderBadge, MarvelLogo } from './Brand'
import SocialLinks from './Social'
import { openChat } from './SupportChat'
import { COMPANY } from '../content/film'

const PAY = [siVisa, siMastercard, siAmericanexpress, siApplepay, siGooglepay]

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="brand" aria-label="Spider-Man: Brand New Day — home"><SpiderBadge size={30} /> SPIDER-MAN <small>BRAND NEW DAY</small></Link>
            <p className="muted" style={{ maxWidth: '38ch', marginTop: 12 }}>The worldwide club for fans of <i>Spider-Man: Brand New Day</i>. Members in every time zone.</p>
            <ul className="footer-contact">
              <li><Mail size={15} strokeWidth={1.75} aria-hidden="true" /><a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></li>
              <li><MessageCircle size={15} strokeWidth={1.75} aria-hidden="true" /><button className="linkish" onClick={() => openChat()}>Live chat</button></li>
              <li><Clock size={15} strokeWidth={1.75} aria-hidden="true" /><span>{COMPANY.hours}</span></li>
            </ul>
            <SocialLinks />
          </div>
          <nav className="footer-cols" aria-label="Footer">
            <div><h3>Film</h3><Link to="/#film">Overview</Link><Link to="/#cast">Cast</Link><Link to="/#trailer">Trailer</Link><Link to="/#watch">Where to watch</Link></div>
            <div><h3>Club</h3><Link to="/membership">Membership tiers</Link><Link to="/dashboard">My dashboard</Link><Link to="/club">Members area</Link><Link to="/signup">Join free</Link></div>
            <div><h3>Support</h3><Link to="/help">Help centre</Link><button className="linkish" onClick={() => openChat()}>Live chat</button><a href={`mailto:${COMPANY.supportEmail}`}>Contact us</a><Link to="/refunds">Refunds</Link></div>
            <div><h3>Legal</h3><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Use</Link><Link to="/privacy#cookies">Cookie Policy</Link><Link to="/refunds">Refund Policy</Link><Link to="/accessibility">Accessibility</Link></div>
          </nav>
        </div>

        <div className="footer-pay">
          <span className="with-ic"><Lock size={14} strokeWidth={1.75} aria-hidden="true" />Secure payments · all prices in USD</span>
          <ul aria-label="Accepted payment methods">
            {PAY.map((i) => <li key={i.slug} title={i.title}><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" role="img" aria-label={i.title}><path d={i.path} /></svg></li>)}
          </ul>
        </div>

        <div className="footer-bottom">
          <div className="row" style={{ gap: 16 }}>
            <MarvelLogo height={20} />
            <span>© {year} {COMPANY.name}. All rights reserved.</span>
          </div>
          <div className="footer-legal-links">
            <Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/privacy#cookies">Cookies</Link>
          </div>
        </div>
        <p className="legal-note with-ic" style={{ alignItems: 'flex-start' }}>
          <Building2 size={14} strokeWidth={1.75} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
          <span>{COMPANY.name} is operated by {COMPANY.legalName}, {COMPANY.address}.</span>
        </p>
        <p className="legal-note">
          Unofficial fan community. Spider-Man and all related characters and elements are trademarks of Marvel. <i>Spider-Man: Brand New Day</i> is a Columbia Pictures /
          Marvel Studios film distributed by Sony Pictures. Official artwork and logos are used under licence.
        </p>
      </div>
    </footer>
  )
}

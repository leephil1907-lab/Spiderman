import { useState } from 'react'
import { BadgeCheck, CalendarDays, CreditCard, Rotate3d, ShieldCheck } from 'lucide-react'
import { tierById } from '../../shared/tiers.js'

const toDate = (value) => {
  if (!value) return null
  const date = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z')
  return Number.isNaN(date.getTime()) ? null : date
}

const dateLabel = (value, locale, options = { dateStyle: 'medium' }) => {
  const date = toDate(value)
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : '—'
}

const maskEmail = (email = '') => {
  const [name, domain] = email.split('@')
  if (!name || !domain) return '—'
  return name.length < 3 ? `${name[0]}•••@${domain}` : `${name.slice(0, 2)}•••@${domain}`
}

export default function MemberCard({ user, locale }) {
  const [flipped, setFlipped] = useState(false)
  const tier = tierById(user.tier)
  const paid = tier.rank > 0
  const renewal = paid ? toDate(user.renewsAt) : null
  const issueDate = dateLabel(user.createdAt, locale)
  const validThrough = renewal ? dateLabel(renewal, locale) : 'No expiry'

  const toggle = () => setFlipped((value) => !value)
  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }

  return (
    <div className="member-card-wrap">
      <div
        className={`member-card-scene${flipped ? ' is-flipped' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`Digital BND Fan Club membership card for ${user.name}. Tap to show the back.`}
        aria-pressed={flipped}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <div className="member-card-inner">
          <section className="member-card member-card-front" aria-hidden={flipped}>
            <div className="member-card-web" aria-hidden="true" />
            <div className="mc-top">
              <span>BND FAN CLUB</span>
              <span>{tier.name}</span>
            </div>
            <div className="mc-center">
              <div className="mc-mark" aria-hidden="true"><span>SPIDER</span><b>MAN</b></div>
              <p className="mc-member-type">Membership credential</p>
              <h3>{user.name}</h3>
            </div>
            <div className="mc-bottom">
              <span>{user.memberNo}</span>
              <span className="mc-flip-hint"><Rotate3d size={14} /> Tap to flip</span>
            </div>
          </section>

          <section className="member-card member-card-back" aria-hidden={!flipped}>
            <div className="mc-back-head">
              <span>BND FAN CLUB</span>
              <BadgeCheck size={22} aria-hidden="true" />
            </div>
            <div className="mc-back-grid">
              <div><span>Member</span><b>{user.name}</b></div>
              <div><span>Member ID</span><b>{user.memberNo}</b></div>
              <div><span>Membership</span><b>{tier.level} · {tier.name}</b></div>
              <div><span>Email</span><b>{maskEmail(user.email)}</b></div>
              <div><span>Issued</span><b>{issueDate}</b></div>
              <div><span>Valid through</span><b>{validThrough}</b></div>
            </div>
            <div className="mc-verified">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>Account-linked member credential</span>
              <span className="mc-active">{paid ? 'ACTIVE' : 'MEMBER'}</span>
            </div>
            <p className="mc-disclaimer">This digital credential identifies the account holder's BND Fan Club membership. It is an independent fan-club credential and is not an official Marvel or Sony credential.</p>
            <div className="mc-back-foot">
              <span><CreditCard size={13} /> {paid ? 'Membership active' : 'Free membership'}</span>
              <span><CalendarDays size={13} /> Issued {issueDate}</span>
            </div>
          </section>
        </div>
      </div>
      <p className="member-card-caption"><Rotate3d size={15} aria-hidden="true" /> Touch or click the card to view the membership details.</p>
    </div>
  )
}

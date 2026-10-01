import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CreditCard, ShieldCheck, RefreshCcw, Globe2, CircleCheck, X, Check, Minus, ChevronDown, MessageCircle } from 'lucide-react'
import TierCards, { BillingToggle } from '../components/TierCards'
import Footer from '../components/Footer'
import { Reveal } from '../components/Motion'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { TIERS, FEATURES, tierById, priceOf, hasTier, isInterval } from '../../shared/tiers.js'
import { formatMoney } from '../../shared/currency.js'
import { openChat } from '../components/SupportChat'

function Checkout({ tier, interval, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [provider, setProvider] = useState('Stripe')
  const { user } = useAuth()
  const price = tier.rank ? priceOf(tier.id, interval) : 0
  const down = tierById(user.tier).rank > tier.rank
  useEffect(() => { api('/membership/tiers').then((d) => setProvider(d.provider === 'paystack' ? 'Paystack' : 'Stripe')).catch(() => {}) }, [])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [busy, onClose])
  const pay = async () => {
    setBusy(true); setErr(null)
    try { onDone(await api('/membership/checkout', { method: 'POST', body: { tier: tier.id, interval } })) }
    catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <div className="row">
          <h2 id="co-title" className="h-2" style={{ fontSize: 26 }}>{down ? 'Switch plan' : 'Confirm membership'}</h2>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} strokeWidth={1.75} /></button>
        </div>
        <div className="summary">
          <div><span className="muted">Plan</span><b>{tier.level} · {tier.name}</b></div>
          <div><span className="muted">Billing</span><span>{price ? `${interval === 'year' ? 'Yearly' : 'Monthly'} · cancel any time` : '—'}</span></div>
          <div><span className="muted">Member</span><span>{user.email}</span></div>
          <div className="total"><span>Due today (USD)</span><span className="tabular">{formatMoney(price)}</span></div>
        </div>
        {price > 0 && (
          <div className="alert alert-demo with-ic" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
            <CreditCard size={18} strokeWidth={1.75} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
            <span><b>Payment setup pending:</b> no card is charged until {provider} credentials are configured. Membership pricing and access are already set in the club.</span>
          </div>
        )}
        {err && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{err}</div>}
        <div className="row">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={pay} disabled={busy} autoFocus>
            {busy ? 'Processing…' : price ? `Pay ${formatMoney(price)}` : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Compare({ interval, current }) {
  return (
    <div className="compare-wrap">
      <table className="compare">
        <caption className="sr-only">Compare membership tiers</caption>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Feature</span></th>
            {TIERS.map((t) => (
              <th key={t.id} scope="col" className={current === t.id ? 'is-current' : ''}>
                <span className="tier-level">{t.level}</span>
                <b>{t.name}</b>
                <span className="cmp-price tabular">{formatMoney(priceOf(t.id, interval))}{t.rank > 0 && <small>/{interval === 'year' ? 'yr' : 'mo'}</small>}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((g) => (
            <Fragment key={g.group}>
              <tr className="cmp-group"><th colSpan={TIERS.length + 1} scope="colgroup">{g.group}</th></tr>
              {g.rows.map(([label, min]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {TIERS.map((t) => (
                    <td key={t.id} className={current === t.id ? 'is-current' : ''}>
                      {hasTier(t.id, min)
                        ? <Check size={18} strokeWidth={2.25} className="yes" aria-label="Included" />
                        : <Minus size={16} strokeWidth={1.75} className="no" aria-label="Not included" />}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FAQ = [
  ['What currency am I charged in?', 'All memberships are priced and charged in US dollars (USD), wherever you live. If your card is in another currency, your bank converts it at its own rate.'],
  ['Can I switch tiers or cancel?', 'Yes, any time from your Account page. Upgrades apply immediately; if you drop back to free, your paid perks stay active until the end of the period you paid for.'],
  ['What’s the difference between monthly and yearly?', 'Same perks. Yearly is billed once a year and works out to about two months free compared with paying monthly.'],
  ['Do I need a paid tier to join?', 'No. Friendly Neighborhood is free forever and includes your member card, personal dashboard, the Theory Board and trivia.'],
  ['Is this an official Marvel or Sony site?', 'No. BND Fan Club is a fan community. See our Terms for details on trademarks and licensed artwork.'],
]

export default function Membership() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const [interval, setBilling] = useState(() => (isInterval(sp.get('billing')) ? sp.get('billing') : 'month'))
  const [choosing, setChoosing] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    const plan = sp.get('plan')
    if (plan && user && TIERS.some((t) => t.id === plan) && !(plan === user.tier && (plan === 'free' || user.billingInterval === interval))) setChoosing(tierById(plan))
  }, [sp, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (t, iv) => {
    if (!user) return nav(`/signup?plan=${t.id}&billing=${iv}`)
    setChoosing(t)
  }
  const clearPlan = () => { sp.delete('plan'); setSp(sp, { replace: true }) }
  return (
    <>
      <main className="club" id="main">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Membership</span>
            <h1 className="h-display">Pick your level of<br /><span className="muted">spider-sense.</span></h1>
            <div className="row" style={{ marginTop: 16, alignItems: 'flex-end' }}>
              <p className="lede">Four tiers, from free to the full Multiverse. All prices are in US dollars. Switch tiers or drop back to free any time.</p>
              <span className="spacer" />
              <BillingToggle value={interval} onChange={setBilling} />
            </div>
          </Reveal>
          {done && (
            <div className="alert alert-ok with-ic" role="status" style={{ marginTop: 28 }}>
              <CircleCheck size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>You’re now <b>{tierById(done.user.tier).name}</b>. Reference {done.reference}. <Link to="/dashboard">Open your dashboard →</Link></span>
            </div>
          )}
          <TierCards current={user?.tier} currentInterval={user?.billingInterval} interval={interval} onChoose={choose} />
          <ul className="assurances">
            <li><Globe2 size={18} strokeWidth={1.75} aria-hidden="true" />One price worldwide, in USD</li>
            <li><ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />Secure card checkout</li>
            <li><RefreshCcw size={18} strokeWidth={1.75} aria-hidden="true" />Cancel or switch any time</li>
          </ul>

          <section className="section-tight" aria-labelledby="cmp-h">
            <Reveal>
              <span className="eyebrow">Compare tiers</span>
              <h2 id="cmp-h" className="h-2">What each tier unlocks.</h2>
            </Reveal>
            <Compare interval={interval} current={user?.tier} />
          </section>

          <section className="section-tight" aria-labelledby="faq-h">
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <Reveal>
                <span className="eyebrow">Questions</span>
                <h2 id="faq-h" className="h-2">Membership FAQ</h2>
                <p className="lede" style={{ marginTop: 12 }}>Can’t find your answer? Our assistant replies instantly, and a person from the club team can take over.</p>
                <button className="btn" style={{ marginTop: 22 }} onClick={() => openChat('Membership tiers')}><MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />Chat with support</button>
              </Reveal>
              <div className="faq">
                {FAQ.map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}<ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" /></summary>
                    <p className="muted">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      {choosing && user && (
        <Checkout tier={choosing} interval={interval}
          onClose={() => { setChoosing(null); clearPlan() }}
          onDone={(d) => { setUser(d.user); setDone(d); setChoosing(null); clearPlan() }} />
      )}
      <Footer />
    </>
  )
}

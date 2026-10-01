import { Check, Crown, Sparkles, Orbit } from 'lucide-react'
import { TIERS, tierById, priceOf, yearlySaving } from '../../shared/tiers.js'
import { formatMoney } from '../../shared/currency.js'
import { useSpotlight } from './Motion'

const TIER_ICON = { spidersense: Crown, multiverse: Orbit }

/** Monthly / Yearly switch. */
export function BillingToggle({ value, onChange }) {
  return (
    <div className="billing-toggle" role="radiogroup" aria-label="Billing period">
      {[['month', 'Monthly'], ['year', 'Yearly']].map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {l}{v === 'year' && <span className="save">2 months free</span>}
        </button>
      ))}
    </div>
  )
}

function Tier({ t, current, currentInterval, interval, onChoose, busy }) {
  const ref = useSpotlight()
  const price = priceOf(t.id, interval)
  const isCurrent = current === t.id && (t.rank === 0 || currentInterval === interval)
  const isDown = current && tierById(current).rank > t.rank
  const Icon = TIER_ICON[t.id]
  const label = !current ? (price ? `Choose ${t.name}` : 'Join free')
    : current === t.id ? `Switch to ${interval === 'year' ? 'yearly' : 'monthly'}`
      : isDown ? `Switch to ${t.name}` : `Upgrade to ${t.name}`
  return (
    <article ref={ref} className={`tier spot ${t.featured ? 'featured' : ''}`} aria-label={`${t.name} plan`}>
      {t.featured && <span className="badge"><Sparkles size={12} strokeWidth={2} aria-hidden="true" /> Most popular</span>}
      <div>
        <span className="tier-level">{t.level}</span>
        <h3 className="with-ic">{Icon && <Icon size={18} strokeWidth={1.75} aria-hidden="true" />}{t.name}</h3>
        <p className="muted" style={{ marginTop: 6 }}>{t.tagline}</p>
      </div>
      <div>
        <div className="price tabular">{formatMoney(price)}{price > 0 && <small> / {interval === 'year' ? 'year' : 'month'}</small>}</div>
        <div className="price-note">
          {price === 0 ? 'Free forever' : interval === 'year' ? `${formatMoney(+(price / 12).toFixed(2))}/mo billed yearly · save ${yearlySaving(t.id)}%` : `or ${formatMoney(t.price.year)}/year`}
        </div>
      </div>
      <ul className="perks">{t.perks.map((p) => <li key={p}><Check size={16} strokeWidth={2.25} aria-hidden="true" />{p}</li>)}</ul>
      {isCurrent ? (
        <span className="current-tag with-ic"><Check size={14} strokeWidth={2.5} aria-hidden="true" /> Your current plan</span>
      ) : (
        <button className={`btn btn-block ${t.featured ? 'btn-primary' : ''}`} onClick={() => onChoose(t, interval)} disabled={busy}>{label}</button>
      )}
    </article>
  )
}
export default function TierCards({ interval = 'month', ...props }) {
  return <div className="tiers">{TIERS.map((t) => <Tier key={t.id} t={t} interval={interval} {...props} />)}</div>
}

// Site-wide settings, editable from the admin control panel. Stored as JSON in the
// `settings` table. Everything returned by publicSettings() is safe to show visitors —
// never put secrets (admin email, keys, the admin path) in here.
import { db } from './db.js'
import { TIERS } from '../shared/tiers.js'

export const ICONS = ['sparkles', 'megaphone', 'ticket', 'calendar', 'film', 'gift', 'zap', 'star', 'globe']
export const TRANSITIONS = ['mix', 'flip', 'slide', 'blur', 'zoom', 'swing']

const defaultPrices = Object.fromEntries(TIERS.filter((t) => t.rank > 0).map((t) => [t.id, { ...t.price }]))
export const DEFAULTS = {
  announcement: {
    enabled: true,
    mode: 'rotate',          // rotate (one at a time, with transitions) | marquee (continuous scroll)
    transition: 'mix',       // mix cycles through all of them
    interval: 5,             // seconds per message (rotate)
    speed: 40,               // seconds per loop (marquee)
    theme: 'scarlet',        // scarlet | ink | glass
    dismissible: true,
    version: 1,
    items: [
      { id: 'a1', icon: 'film', text: 'Spider-Man: Brand New Day is in cinemas worldwide', link: '/#watch', linkLabel: 'Find a cinema' },
      { id: 'a2', icon: 'calendar', text: 'Members’ watch parties are live in 10 cities this season', link: '/club?tab=events', linkLabel: 'RSVP' },
      { id: 'a3', icon: 'sparkles', text: 'New: Multiverse tier with live Q&A and collectible drops', link: '/membership?plan=multiverse', linkLabel: 'See tiers' },
      { id: 'a4', icon: 'gift', text: 'Go yearly and get two months free on any paid tier', link: '/membership?billing=year', linkLabel: 'Compare' },
    ],
  },
  site: { maintenance: false, maintenanceMessage: 'We’re swinging back shortly. The club is getting an upgrade.', signupsOpen: true, statusText: 'In cinemas worldwide' },
  support: { chatEnabled: true, assistantEnabled: true, humanHandoff: true, ticketsEnabled: true, hours: 'Assistant 24/7 · Team replies within 24 hours', supportEmail: 'support@bndfanclub.com', agentName: 'BND Team' },
  company: { name: 'BND Fan Club', legalName: '[Registered company name]', address: '[Registered business address]', privacyEmail: 'privacy@bndfanclub.com' },
  content: { trailerYouTubeId: '', posterSrc: '' },
  social: {
    instagram: 'https://www.instagram.com/spidermanmovie/', x: 'https://x.com/SpiderManMovie',
    tiktok: 'https://www.tiktok.com/@spidermanmovie', youtube: 'https://www.youtube.com/@SonyPictures', discord: '',
  },
  prices: defaultPrices,
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over
  const out = { ...base }
  for (const k of Object.keys(base)) if (k in over) out[k] = Array.isArray(base[k]) ? (Array.isArray(over[k]) ? over[k] : base[k]) : deepMerge(base[k], over[k])
  return out
}
const str = (v, max, d = '') => (typeof v === 'string' ? v.trim().slice(0, max) : d)
const bool = (v, d) => (typeof v === 'boolean' ? v : d)
const num = (v, min, max, d) => (Number.isFinite(+v) ? Math.min(max, Math.max(min, +v)) : d)
const url = (v) => { const s = str(v, 300); return !s || /^(https?:\/\/|\/)/i.test(s) ? s : '' }
const money = (v, d) => (Number.isFinite(+v) && +v >= 0.5 && +v <= 9999 ? Math.round(+v * 100) / 100 : d)

/** Strictly validate an incoming settings object (unknown keys are dropped). */
export function sanitize(input, cur) {
  const a = input.announcement || {}, ca = cur.announcement
  const items = Array.isArray(a.items) ? a.items.slice(0, 12).map((it, i) => ({
    id: str(it.id, 20) || `a${Date.now().toString(36)}${i}`,
    icon: ICONS.includes(it.icon) ? it.icon : 'sparkles',
    text: str(it.text, 140),
    link: url(it.link),
    linkLabel: str(it.linkLabel, 30),
  })).filter((it) => it.text) : ca.items
  const s = input.site || {}, su = input.support || {}, co = input.company || {}, ct = input.content || {}, so = input.social || {}, pr = input.prices || {}
  return {
    announcement: {
      enabled: bool(a.enabled, ca.enabled),
      mode: ['rotate', 'marquee'].includes(a.mode) ? a.mode : ca.mode,
      transition: TRANSITIONS.includes(a.transition) ? a.transition : ca.transition,
      interval: num(a.interval, 2, 30, ca.interval),
      speed: num(a.speed, 10, 120, ca.speed),
      theme: ['scarlet', 'ink', 'glass'].includes(a.theme) ? a.theme : ca.theme,
      dismissible: bool(a.dismissible, ca.dismissible),
      // any content change re-shows the bar to visitors who dismissed it
      version: JSON.stringify(items) !== JSON.stringify(ca.items) ? ca.version + 1 : ca.version,
      items,
    },
    site: {
      maintenance: bool(s.maintenance, cur.site.maintenance),
      maintenanceMessage: str(s.maintenanceMessage, 200, cur.site.maintenanceMessage),
      signupsOpen: bool(s.signupsOpen, cur.site.signupsOpen),
      statusText: str(s.statusText, 40, cur.site.statusText),
    },
    support: {
      chatEnabled: bool(su.chatEnabled, cur.support.chatEnabled),
      assistantEnabled: bool(su.assistantEnabled, cur.support.assistantEnabled),
      humanHandoff: bool(su.humanHandoff, cur.support.humanHandoff),
      ticketsEnabled: bool(su.ticketsEnabled, cur.support.ticketsEnabled),
      hours: str(su.hours, 80, cur.support.hours),
      supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(su.supportEmail, 120)) ? str(su.supportEmail, 120) : cur.support.supportEmail,
      agentName: str(su.agentName, 30, cur.support.agentName) || 'BND Team',
    },
    company: {
      name: str(co.name, 60, cur.company.name) || 'BND Fan Club',
      legalName: str(co.legalName, 120, cur.company.legalName),
      address: str(co.address, 200, cur.company.address),
      privacyEmail: str(co.privacyEmail, 120, cur.company.privacyEmail),
    },
    content: { trailerYouTubeId: str(ct.trailerYouTubeId, 20, cur.content.trailerYouTubeId).replace(/[^\w-]/g, ''), posterSrc: url(ct.posterSrc ?? cur.content.posterSrc) },
    social: Object.fromEntries(Object.keys(DEFAULTS.social).map((k) => [k, so[k] === undefined ? cur.social[k] : url(so[k])])),
    prices: Object.fromEntries(Object.keys(DEFAULTS.prices).map((k) => [k, {
      month: money(pr[k]?.month, cur.prices[k].month), year: money(pr[k]?.year, cur.prices[k].year),
    }])),
  }
}

let cache = null
export function getSettings() {
  if (cache) return cache
  const row = db.prepare("SELECT value FROM settings WHERE key = 'site'").get()
  cache = deepMerge(DEFAULTS, row ? JSON.parse(row.value) : {})
  applyPrices(cache.prices)
  return cache
}
export function saveSettings(input) {
  const next = sanitize(input, getSettings())
  db.prepare("INSERT INTO settings (key, value) VALUES ('site', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(next))
  cache = next
  applyPrices(next.prices)
  return next
}
/** Prices live in shared/tiers.js; admin overrides are applied in place (server + client). */
export function applyPrices(prices) {
  for (const t of TIERS) if (prices?.[t.id]) t.price = { ...t.price, ...prices[t.id] }
}
export const publicSettings = () => getSettings()

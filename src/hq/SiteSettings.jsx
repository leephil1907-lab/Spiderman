import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Undo2, Eye, Construction, LifeBuoy, Building2, Clapperboard, Share2, DollarSign, Megaphone } from 'lucide-react'
import { useSettingsUpdate } from '../lib/settings'
import { AnnouncementBarView, AB_ICONS } from '../components/AnnouncementBar'
import { TIERS } from '../../shared/tiers.js'
import { useHQ, Switch, Seg } from './Panel'
import { L } from './Sections'

/** Load the full settings object, edit a draft, save the whole thing. */
function useDraft() {
  const { call, notify } = useHQ()
  const updatePublic = useSettingsUpdate()
  const [saved, setSaved] = useState(null)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { call('/admin/settings').then((d) => { setSaved(d.settings); setDraft(d.settings) }).catch(() => {}) }, [call])
  const dirty = useMemo(() => saved && JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft])
  const patch = useCallback((group, values) => setDraft((d) => ({ ...d, [group]: { ...d[group], ...values } })), [])
  const save = async () => {
    setBusy(true)
    try {
      const d = await call('/admin/settings', { method: 'PUT', body: { settings: draft } })
      setSaved(d.settings); setDraft(d.settings); updatePublic?.(d.settings); notify('Saved — live on the site now')
    } catch (e) { notify(e.message, 'err') } finally { setBusy(false) }
  }
  // warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])
  return { draft, setDraft, patch, dirty, save, reset: () => setDraft(saved), busy }
}

function SaveBar({ dirty, busy, save, reset }) {
  return (
    <div className={`hq-savebar ${dirty ? 'show' : ''}`} aria-hidden={!dirty}>
      <span>You have unsaved changes</span>
      <button className="btn btn-sm" onClick={reset} disabled={!dirty || busy} tabIndex={dirty ? 0 : -1}><Undo2 size={15} aria-hidden="true" />Discard</button>
      <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || busy} tabIndex={dirty ? 0 : -1}><Save size={15} aria-hidden="true" />{busy ? 'Saving…' : 'Save & publish'}</button>
    </div>
  )
}

// ───────── announcements ─────────
const TRANS = [['mix', 'Mix'], ['flip', 'Flip'], ['slide', 'Slide'], ['blur', 'Blur'], ['zoom', 'Zoom'], ['swing', 'Swing']]
export function Announcements() {
  const { draft, patch, dirty, save, reset, busy } = useDraft()
  if (!draft) return <div className="hq-section"><div className="hq-skel" /></div>
  const a = draft.announcement
  const setItems = (items) => patch('announcement', { items })
  const setItem = (i, v) => setItems(a.items.map((it, k) => (k === i ? { ...it, ...v } : it)))
  const move = (i, d) => { const items = [...a.items]; [items[i], items[i + d]] = [items[i + d], items[i]]; setItems(items) }
  const previewKey = JSON.stringify([a.mode, a.transition, a.items.length, a.theme])

  return (
    <div className="hq-section">
      <header className="hq-head"><div><h1>Announcement bar</h1><p className="muted">The animated strip at the very top of every page. Changes appear for visitors as soon as you publish; editing messages re-shows the bar to anyone who dismissed it.</p></div></header>

      <section className="hq-card hq-preview">
        <div className="row"><h2 className="with-ic"><Eye size={16} aria-hidden="true" />Live preview</h2><span className="spacer" />{!a.enabled && <span className="tag hot">Hidden on the site</span>}</div>
        <div className="hq-preview-stage">
          {a.items.length ? <AnnouncementBarView key={previewKey} config={{ ...a, dismissible: a.dismissible }} preview onDismiss={a.dismissible ? () => {} : undefined} /> : <p className="muted">Add a message to see the preview.</p>}
        </div>
      </section>

      <div className="hq-grid-2">
        <section className="hq-card">
          <h2>Display</h2>
          <Switch checked={a.enabled} onChange={(v) => patch('announcement', { enabled: v })} label="Show the announcement bar" />
          <Switch checked={a.dismissible} onChange={(v) => patch('announcement', { dismissible: v })} label="Visitors can dismiss it" help="Remembered per device until you change the messages." />
          <L group label="Mode"><Seg label="Mode" value={a.mode} onChange={(v) => patch('announcement', { mode: v })} options={[['rotate', 'Rotate one by one'], ['marquee', 'Continuous scroll']]} /></L>
          <L group label="Theme"><Seg label="Theme" value={a.theme} onChange={(v) => patch('announcement', { theme: v })} options={[['scarlet', 'Scarlet'], ['ink', 'Ink'], ['glass', 'Glass']]} /></L>
        </section>
        <section className="hq-card">
          <h2>Motion</h2>
          {a.mode === 'rotate' ? (
            <>
              <L group label="Transition" help="Mix cycles flip → slide → blur → zoom → swing. Visitors with reduced motion get no animation.">
                <Seg label="Transition" value={a.transition} onChange={(v) => patch('announcement', { transition: v })} options={TRANS} />
              </L>
              <L label={`Time per message · ${a.interval}s`}><input type="range" min={2} max={30} step={1} value={a.interval} onChange={(e) => patch('announcement', { interval: +e.target.value })} /></L>
            </>
          ) : (
            <L label={`Loop duration · ${a.speed}s`} help="Longer = slower scroll. Pauses on hover."><input type="range" min={10} max={120} step={5} value={a.speed} onChange={(e) => patch('announcement', { speed: +e.target.value })} /></L>
          )}
        </section>
      </div>

      <section className="hq-card">
        <div className="row"><h2>Messages <span className="faint">({a.items.length}/12)</span></h2><span className="spacer" />
          <button className="btn btn-sm" disabled={a.items.length >= 12} onClick={() => setItems([...a.items, { id: 'n' + Date.now().toString(36), icon: 'megaphone', text: '', link: '', linkLabel: '' }])}><Plus size={15} aria-hidden="true" />Add message</button></div>
        <ol className="hq-items">
          {a.items.map((it, i) => {
            const Icon = AB_ICONS[it.icon] || Megaphone
            return (
              <li key={it.id} className="hq-item">
                <div className="hq-item-icons">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  <select className="input hq-select sm" aria-label="Icon" value={it.icon} onChange={(e) => setItem(i, { icon: e.target.value })}>
                    {Object.keys(AB_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <L label="Message" wide><input className="input" maxLength={140} value={it.text} onChange={(e) => setItem(i, { text: e.target.value })} placeholder="e.g. Tickets for the London watch party are live" /></L>
                <L label="Link (optional)" help="/membership or https://…"><input className="input" value={it.link} onChange={(e) => setItem(i, { link: e.target.value })} /></L>
                <L label="Button text"><input className="input" maxLength={30} value={it.linkLabel} onChange={(e) => setItem(i, { linkLabel: e.target.value })} placeholder="Learn more" /></L>
                <div className="hq-item-actions">
                  <button className="hq-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={16} /></button>
                  <button className="hq-icon" disabled={i === a.items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={16} /></button>
                  <button className="hq-icon danger" onClick={() => setItems(a.items.filter((_, k) => k !== i))} aria-label="Delete message"><Trash2 size={16} /></button>
                </div>
              </li>
            )
          })}
        </ol>
        {a.items.some((it) => !it.text.trim()) && <p className="faint" style={{ fontSize: 13 }}>Empty messages are removed when you publish.</p>}
      </section>
      <SaveBar dirty={dirty} busy={busy} save={save} reset={reset} />
    </div>
  )
}

// ───────── general settings ─────────
export function SiteSettings() {
  const { draft, patch, dirty, save, reset, busy } = useDraft()
  if (!draft) return <div className="hq-section"><div className="hq-skel" /></div>
  const { site, support, company, content, social, prices } = draft
  const txt = (group, key) => ({ value: draft[group][key] ?? '', onChange: (e) => patch(group, { [key]: e.target.value }) })
  return (
    <div className="hq-section">
      <header className="hq-head"><div><h1>Settings</h1><p className="muted">Site-wide controls. Everything here is public-facing except where noted — never put private emails or keys in these fields.</p></div></header>

      <section className={`hq-card ${site.maintenance ? 'hq-alert' : ''}`}>
        <h2 className="with-ic"><Construction size={17} aria-hidden="true" />Site status</h2>
        <Switch checked={site.maintenance} onChange={(v) => patch('site', { maintenance: v })} label="Maintenance mode" help="Visitors see a holding page; you (signed in as admin) can still browse everything." />
        {site.maintenance && <L label="Maintenance message" wide><input className="input" maxLength={200} {...txt('site', 'maintenanceMessage')} /></L>}
        <Switch checked={site.signupsOpen} onChange={(v) => patch('site', { signupsOpen: v })} label="Allow new sign-ups" help="Existing members can always log in." />
      </section>

      <section className="hq-card">
        <h2 className="with-ic"><LifeBuoy size={17} aria-hidden="true" />Support</h2>
        <div className="hq-switches">
          <Switch checked={support.chatEnabled} onChange={(v) => patch('support', { chatEnabled: v })} label="Live chat widget" help="The draggable chat button on every page." />
          <Switch checked={support.assistantEnabled} onChange={(v) => patch('support', { assistantEnabled: v })} label="Instant assistant" help="Off = every chat goes straight to the team." />
          <Switch checked={support.humanHandoff} onChange={(v) => patch('support', { humanHandoff: v })} label="“Talk to a person”" help="Off = visitors are pointed to tickets instead." />
          <Switch checked={support.ticketsEnabled} onChange={(v) => patch('support', { ticketsEnabled: v })} label="Support tickets" help="The contact form in the Help centre." />
        </div>
        <div className="hq-fields">
          <L label="Public support email" help="Shown in the footer and help pages. Use a support address, not your personal one."><input className="input" type="email" {...txt('support', 'supportEmail')} /></L>
          <L label="Team name on replies"><input className="input" maxLength={30} {...txt('support', 'agentName')} /></L>
          <L label="Support hours" wide><input className="input" maxLength={80} {...txt('support', 'hours')} /></L>
        </div>
      </section>

      <section className="hq-card">
        <h2 className="with-ic"><DollarSign size={17} aria-hidden="true" />Membership prices (USD)</h2>
        <p className="muted" style={{ fontSize: 13 }}>Applies to new checkouts immediately. Existing subscriptions keep the price they paid until renewal.</p>
        <div className="hq-prices">
          {TIERS.filter((t) => t.rank > 0).map((t) => (
            <div key={t.id} className="hq-price">
              <b>{t.name}</b>
              <L label="Monthly $"><input className="input" type="number" min={0.5} step={0.01} value={prices[t.id].month} onChange={(e) => patch('prices', { [t.id]: { ...prices[t.id], month: e.target.value === '' ? '' : +e.target.value } })} /></L>
              <L label="Yearly $"><input className="input" type="number" min={0.5} step={0.01} value={prices[t.id].year} onChange={(e) => patch('prices', { [t.id]: { ...prices[t.id], year: e.target.value === '' ? '' : +e.target.value } })} /></L>
              <small className="faint">{prices[t.id].month > 0 && prices[t.id].year > 0 ? `Yearly saves ${Math.max(0, Math.round((1 - prices[t.id].year / (prices[t.id].month * 12)) * 100))}%` : ''}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="hq-grid-2">
        <section className="hq-card">
          <h2 className="with-ic"><Building2 size={17} aria-hidden="true" />Company &amp; legal</h2>
          <p className="muted" style={{ fontSize: 13 }}>Shown in the footer, Privacy Policy and Terms.</p>
          <div className="hq-fields one">
            <L label="Club name"><input className="input" {...txt('company', 'name')} /></L>
            <L label="Registered legal name"><input className="input" {...txt('company', 'legalName')} /></L>
            <L label="Registered address"><input className="input" {...txt('company', 'address')} /></L>
            <L label="Privacy contact email"><input className="input" type="email" {...txt('company', 'privacyEmail')} /></L>
          </div>
        </section>
        <section className="hq-card">
          <h2 className="with-ic"><Clapperboard size={17} aria-hidden="true" />Film media</h2>
          <div className="hq-fields one">
            <L label="Trailer YouTube ID" help="The part after v= in youtube.com/watch?v=…"><input className="input" {...txt('content', 'trailerYouTubeId')} placeholder="e.g. dQw4w9WgXcQ" /></L>
            <L label="Poster image URL" help="/media/poster.jpg (file in public/media) or https://…"><input className="input" {...txt('content', 'posterSrc')} /></L>
          </div>
          {content.trailerYouTubeId && <p className="faint" style={{ fontSize: 13 }}>Trailer: youtube.com/watch?v={content.trailerYouTubeId}</p>}
        </section>
      </div>

      <section className="hq-card">
        <h2 className="with-ic"><Share2 size={17} aria-hidden="true" />Social links</h2>
        <p className="muted" style={{ fontSize: 13 }}>Leave a field empty to hide that icon in the footer.</p>
        <div className="hq-fields">
          {Object.keys(social).map((k) => <L key={k} label={k === 'x' ? 'X (Twitter)' : k[0].toUpperCase() + k.slice(1)}><input className="input" {...txt('social', k)} placeholder="https://…" /></L>)}
        </div>
      </section>
      <SaveBar dirty={dirty} busy={busy} save={save} reset={reset} />
    </div>
  )
}

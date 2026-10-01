// Public site settings (edited in the admin control panel). Fetched once before the
// first render; values are also written into the shared content objects so every page
// (footer, legal, prices, socials, trailer) reflects the admin's changes.
import { createContext, useCallback, useContext, useState } from 'react'
import { COMPANY, SOCIAL, FILM } from '../content/film'
import { TIERS } from '../../shared/tiers.js'

const Ctx = createContext(null)
let initial = null

export function applySettings(s) {
  if (!s) return
  Object.assign(COMPANY, {
    name: s.company.name, legalName: s.company.legalName, address: s.company.address, privacyEmail: s.company.privacyEmail,
    supportEmail: s.support.supportEmail, hours: s.support.hours,
  })
  for (const so of SOCIAL) if (s.social[so.name] !== undefined) so.url = s.social[so.name]
  FILM.trailerYouTubeId = s.content.trailerYouTubeId || FILM.trailerYouTubeId
  FILM.posterSrc = s.content.posterSrc || FILM.posterSrc
  for (const t of TIERS) if (s.prices?.[t.id]) t.price = { ...t.price, ...s.prices[t.id] }
}

export async function loadSettings() {
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 4000)
    const r = await fetch('/api/settings', { signal: ctl.signal, credentials: 'same-origin' })
    clearTimeout(timer)
    if (r.ok) initial = (await r.json()).settings
  } catch { /* offline / API down: run with built-in defaults */ }
  applySettings(initial)
  return initial
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(initial)
  const update = useCallback((s) => { applySettings(s); setSettings(s) }, [])
  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>
}
export const useSettings = () => useContext(Ctx)?.settings
export const useSettingsUpdate = () => useContext(Ctx)?.update

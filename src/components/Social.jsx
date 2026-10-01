import { siInstagram, siX, siTiktok, siYoutube, siDiscord } from 'simple-icons'
import { SOCIAL } from '../content/film'

const ICONS = { instagram: siInstagram, x: siX, tiktok: siTiktok, youtube: siYoutube, discord: siDiscord }
/** Real brand glyphs from Simple Icons — each network's own mark, in one colour. */
export function BrandIcon({ name, size = 18 }) {
  const i = ICONS[name]
  if (!i) return null
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={i.path} /></svg>
}
export default function SocialLinks() {
  return (
    <ul className="social" aria-label="Social channels">
      {SOCIAL.filter((s) => s.url).map((s) => (
        <li key={s.name}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}><BrandIcon name={s.name} /></a>
        </li>
      ))}
    </ul>
  )
}

import { SPIDER_G, SPIDER_VIEWBOX } from './spiderPath'

/** The club's spider emblem (traced vector from the supplied artwork). Inherits currentColor. */
export function SpiderMark({ size = 20, title, className, style }) {
  return (
    <svg viewBox={SPIDER_VIEWBOX} height={size} width={(size * 1566) / 2094} fill="currentColor" className={className} style={style}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: SPIDER_G }} />
  )
}
/** Brand lockup chip: scarlet disc + ink spider. */
export function SpiderBadge({ size = 28 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <SpiderMark size={Math.round(size * 0.66)} style={{ color: 'var(--raw-ink-950)' }} />
    </span>
  )
}
/** Marvel wordmark — licensed asset (vector traced from the supplied logo). */
export function MarvelLogo({ height = 22, className }) {
  return <img src="/brand/marvel-logo.svg" alt="Marvel" height={height} width={Math.round((height * 1992) / 894)} className={className} style={{ height, width: 'auto', display: 'block' }} />
}

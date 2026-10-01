import { createContext, useContext, useMemo } from 'react'
import { formatMoney } from '../../shared/currency.js'
import { COUNTRY_CODES } from '../../shared/countries.js'

// Best-effort, privacy-friendly country guess (used for the nearest cinemas + signup default).
// Prices are always US dollars regardless of country.
const TZ_COUNTRY = {
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Lisbon': 'PT',
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dubai': 'AE',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
  'Africa/Lagos': 'NG', 'Africa/Johannesburg': 'ZA', 'Africa/Nairobi': 'KE', 'Africa/Accra': 'GH',
}
export function detectCountry() {
  try {
    for (const l of navigator.languages || [navigator.language]) {
      const region = new Intl.Locale(l).maximize().region
      if (region && COUNTRY_CODES.includes(region) && !/^en(-US)?$/i.test(l)) return region
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz]
    const region = new Intl.Locale(navigator.language).maximize().region
    return COUNTRY_CODES.includes(region) ? region : 'US'
  } catch { return 'US' }
}
export const userLocale = () => (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
export const countryName = (cc, locale = userLocale()) => { try { return new Intl.DisplayNames([locale], { type: 'region' }).of(cc) } catch { return cc } }
export const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone

const Ctx = createContext(null)
export function LocaleProvider({ children }) {
  const country = useMemo(detectCountry, [])
  const value = useMemo(() => ({ country, currency: 'USD', locale: userLocale(), money: (n) => formatMoney(n) }), [country])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useLocale = () => useContext(Ctx)

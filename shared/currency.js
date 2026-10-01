// All membership pricing is in US dollars, worldwide.
export const CURRENCY = 'USD'
export const DEFAULT_CURRENCY = CURRENCY
export const isCurrency = (c) => c === CURRENCY

/** "$4.99", "$49.99", "Free". Always the US-dollar sign, whatever the visitor's locale. */
export function formatMoney(amount) {
  if (!amount) return 'Free'
  return '$' + (amount % 1 ? amount.toFixed(2) : String(amount))
}

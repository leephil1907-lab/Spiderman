import crypto from 'node:crypto'
// Payment hook. All memberships are charged in USD.
// PAYMENT_PROVIDER = 'stripe' (default) or 'paystack' (Paystack can settle USD for
// eligible merchants). Until that provider's secret key is set the checkout is
// SIMULATED (always succeeds, nothing is charged) so the flow works end to end.
//
// Going live — Stripe: create a Checkout Session (mode: 'subscription', one Price per
// tier × interval), redirect to session.url, and activate the tier ONLY from the
// `checkout.session.completed` webhook after verifying the Stripe-Signature header.
// Going live — Paystack: create a Plan per tier × interval, POST /transaction/initialize
// with currency 'USD' + plan code, redirect to authorization_url, then verify via webhook
// (x-paystack-signature HMAC-SHA512) or GET /transaction/verify/:reference.
export const PROVIDER = process.env.PAYMENT_PROVIDER === 'paystack' ? 'paystack' : 'stripe'
const KEY = PROVIDER === 'stripe' ? process.env.STRIPE_SECRET_KEY : process.env.PAYSTACK_SECRET_KEY
export const SIMULATED = !KEY
export const PROVIDER_SUMMARY = `${PROVIDER}:${SIMULATED ? 'simulated' : 'live'} (USD)`
export function newReference() { return 'BND_' + crypto.randomBytes(8).toString('hex').toUpperCase() }
export async function charge({ amount }) {
  if (!SIMULATED) throw new Error(`${PROVIDER} key is set but the live integration isn't wired yet — see server/payments.js`)
  return { status: 'success', provider: `${PROVIDER}-simulated`, amount, currency: 'USD' }
}

import { Link } from 'react-router-dom'
import { FileWarning, MessageCircle, Mail, ChevronDown, CreditCard, UserRound, PartyPopper, Clapperboard, ShieldCheck } from 'lucide-react'
import Footer from '../components/Footer'
import { Reveal } from '../components/Motion'
import { openChat } from '../components/SupportChat'
import { COMPANY } from '../content/film'
import { TicketForm } from './Tickets'
import { TIERS } from '../../shared/tiers.js'
import { formatMoney } from '../../shared/currency.js'

// TEMPLATE TEXT. Have a lawyer review this before launch and fill in the [bracketed]
// details in src/content/film.js → COMPANY. Written to cover GDPR/UK GDPR, CCPA/CPRA,
// NDPA (Nigeria), POPIA (South Africa) and LGPD (Brazil) in plain language — not legal advice.
const UPDATED = '1 October 2026'
const mail = (e) => <a href={`mailto:${e}`}>{e}</a>

const PRIVACY = [
  ['Who we are', <>{COMPANY.name} (“we”) is an independent fan community operated by {COMPANY.legalName}, {COMPANY.address}. Privacy questions: {mail(COMPANY.privacyEmail)}.</>],
  ['What we collect', <>Account details you give us (name, email, optional country); a hashed password (never the password itself); membership and payment records (tier, amount in USD, billing period, reference — card details are handled by our payment processor, never by us); content you post (theories, likes, RSVPs, trivia scores); support chat messages and any email you leave in the chat; and minimal technical data (IP address for rate-limiting and security, session cookie).</>],
  ['Why we use it', <>To run your account, dashboard and membership (contract); to answer your support requests (contract / legitimate interest); to keep the service secure and prevent abuse (legitimate interest); to meet tax and accounting duties (legal obligation). We don’t sell your data and we don’t use advertising trackers.</>],
  ['Support chat', <>The chat assistant answers from our own help articles on our servers — your messages are not sent to third-party AI services. If you ask for a person, our support staff can read that conversation. Chats are kept for up to 12 months, then deleted.</>],
  ['Cookies', <span id="cookies">We use strictly-necessary cookies only: one for your login session, one to keep a guest support chat connected, and a CSRF safeguard. We store the chat button position in your browser’s local storage. No analytics or advertising cookies are set, so no cookie banner is needed.</span>],
  ['Sharing', <>Our payment processor (Stripe, Inc. or Paystack Payments Ltd.) for paid tiers; our hosting provider [name, region]. Each acts under a data-processing agreement. Some providers may process data outside your country under standard contractual clauses or equivalent safeguards.</>],
  ['How long we keep it', <>Account data: until you delete your account. Payment records: as long as tax law requires (typically 6–7 years). Support chats: up to 12 months. Security logs: up to 30 days.</>],
  ['Your rights', <>Wherever you live, you can access, export, correct or delete your data. Export and deletion are self-serve on your <Link to="/account">Account</Link> page. You may also object to processing, or complain to your local data-protection authority (e.g. ICO, CNIL, NDPC, Information Regulator, ANPD, or your state Attorney General).</>],
  ['Children', <>The club is for people aged 13 and over (16 in some EU countries). We don’t knowingly collect data from younger children.</>],
  ['Changes', <>We’ll post updates here and email members about material changes.</>],
]
const TERMS = [
  ['Unofficial fan site', <>{COMPANY.name} is a fan community. Spider-Man and related characters are trademarks of Marvel. <i>Spider-Man: Brand New Day</i> is a Columbia Pictures / Marvel Studios film distributed by Sony Pictures. Official artwork is used under licence [reference].</>],
  ['Your account', <>You must be 13+ and give accurate details. Keep your password safe; you’re responsible for activity on your account.</>],
  ['Membership tiers & billing', <>We offer four tiers: {TIERS.map((t) => `${t.name} (${t.price.month ? `${formatMoney(t.price.month)}/month or ${formatMoney(t.price.year)}/year` : 'free'})`).join(', ')}. All prices are in US dollars and include any taxes we’re required to collect unless stated otherwise. Paid tiers renew automatically at the end of each billing period until you cancel. Your bank may charge currency-conversion fees.</>],
  ['Switching & cancelling', <>You can upgrade, switch billing period or drop back to free at any time from your Account page. Upgrades take effect immediately. When you cancel, paid perks continue until the end of the period you’ve paid for. See our <Link to="/refunds">Refund Policy</Link>.</>],
  ['Community rules', <>Tag spoilers. Be decent. No harassment, hate, piracy links or leaked footage. We may remove content or suspend accounts that break these rules.</>],
  ['Your content', <>You keep ownership of what you post and give us a licence to display it on the site. You can delete it any time.</>],
  ['Liability', <>The service is provided “as is”. To the extent the law allows, our liability is limited to the amount you paid us in the last 12 months. Nothing here limits rights you have under mandatory consumer law.</>],
  ['Governing law', <>[Jurisdiction]. If you’re a consumer, you also keep the protection of the mandatory laws of the country where you live.</>],
  ['Contact', <>{COMPANY.legalName}, {COMPANY.address} · {mail(COMPANY.supportEmail)}</>],
]
const REFUNDS = [
  ['Our promise', <>If something goes wrong with a payment, we’ll make it right. Contact us within 30 days of a charge and we’ll look at every request individually.</>],
  ['Cooling-off period', <>New paid memberships can be refunded in full within 14 days of the first payment if you haven’t used members-only content (for example, downloaded wallpapers or RSVP’d to an event). Where your local consumer law gives you a longer or stronger right, that applies instead.</>],
  ['Renewals', <>You can cancel at any time before a renewal to avoid the next charge. If you forgot to cancel a yearly renewal, contact us within 14 days of the charge and we’ll refund it if the new period hasn’t been used.</>],
  ['Mistaken or duplicate charges', <>Duplicate charges and billing errors are always refunded in full.</>],
  ['How refunds are paid', <>Refunds go back to the original payment method in US dollars. Your bank may take 5–10 business days to show it, and any currency-conversion difference is set by your bank.</>],
  ['How to ask', <>Use the live chat (“Talk to a person”) or email {mail(COMPANY.supportEmail)} with your member number and payment reference (both on your <Link to="/dashboard">dashboard</Link>).</>],
]
const ACCESSIBILITY = [
  ['Our commitment', <>We want everyone to enjoy the club. We aim to meet WCAG 2.2 level AA.</>],
  ['What we’ve done', <>Keyboard navigation throughout, a skip-to-content link, visible focus styles, labelled icons and form fields, colour contrast checked against our dark theme, and reduced-motion support: if your device asks for less motion, the scroll film’s swing, reveals and tickers are turned off. The support chat button can be moved with your mouse, finger or arrow keys so it never covers content.</>],
  ['Known limitations', <>The 3D scroll film is decorative; all its words are also available as text. Some partner sites we link to (cinemas, payment pages) have their own accessibility standards.</>],
  ['Feedback', <>If something doesn’t work for you, tell us via live chat or {mail(COMPANY.supportEmail)} and we’ll fix it or get you the information another way.</>],
]

function LegalPage({ title, sections, eyebrow = 'Legal' }) {
  return (
    <>
      <main className="club" id="main">
        <div className="wrap legal" style={{ maxWidth: 760 }}>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="h-2">{title}</h1>
          <p className="faint" style={{ marginTop: 8 }}>Last updated {UPDATED}</p>
          <div className="alert alert-demo with-ic" style={{ margin: '22px 0 8px' }}><FileWarning size={18} strokeWidth={1.75} aria-hidden="true" /><span>Template text. Have it reviewed by a lawyer and fill in the bracketed details before launch.</span></div>
          {sections.map(([h, body]) => (
            <section key={h}><h2>{h}</h2><p className="muted">{body}</p></section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
export const Privacy = () => <LegalPage title="Privacy Policy" sections={PRIVACY} />
export const Terms = () => <LegalPage title="Terms of Use" sections={TERMS} />
export const Refunds = () => <LegalPage title="Refund Policy" sections={REFUNDS} />
export const Accessibility = () => <LegalPage title="Accessibility" sections={ACCESSIBILITY} />

const HELP = [
  { icon: CreditCard, title: 'Membership & billing', items: [
    ['What do the tiers cost?', <>{TIERS.map((t) => `${t.name}: ${t.price.month ? `${formatMoney(t.price.month)}/mo or ${formatMoney(t.price.year)}/yr` : 'free'}`).join(' · ')}. <Link to="/membership">Compare tiers</Link>.</>],
    ['What currency am I charged in?', 'US dollars (USD), everywhere in the world. If your card is in another currency, your bank converts it.'],
    ['How do I cancel or switch?', <>From your <Link to="/account">Account</Link> page. Paid perks continue until the end of your paid period.</>],
    ['Can I get a refund?', <>See our <Link to="/refunds">Refund Policy</Link>. Mistaken or duplicate charges are always refunded.</>],
  ] },
  { icon: UserRound, title: 'Account & dashboard', items: [
    ['I forgot my password', <>Use <Link to="/forgot-password">Forgot password</Link>. The link works for 30 minutes.</>],
    ['Where is my member card?', <>On your <Link to="/dashboard">dashboard</Link>, along with your plan, stats and upcoming watch parties.</>],
    ['How do I delete my data?', <>Account → Your data. You can export everything or delete your account permanently.</>],
  ] },
  { icon: PartyPopper, title: 'Watch parties & club', items: [
    ['Who can RSVP to watch parties?', 'Web-Slinger and above. Private screenings need Spider-Sense; the online Multiverse Lounge needs Multiverse.'],
    ['What time is my event?', 'Each event shows the city’s local time and your own time.'],
  ] },
  { icon: Clapperboard, title: 'The film', items: [
    ['Where can I watch it?', <>It’s in cinemas worldwide. Use <Link to="/#watch">Where to watch</Link> to find chains in your region.</>],
    ['Is this an official site?', 'No, it’s a fan community. See the Terms for trademark details.'],
  ] },
]
export function Help() {
  return (
    <>
      <main className="club" id="main">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Help centre</span>
            <h1 className="h-display">How can we<br /><span className="muted">help?</span></h1>
          </Reveal>
          <div className="help-contact">
            <button className="help-card" onClick={() => openChat()}>
              <MessageCircle size={22} strokeWidth={1.5} aria-hidden="true" /><b>Live chat</b><span className="muted">Instant answers 24/7, and a person from the club team when you need one.</span>
            </button>
            <a className="help-card" href={`mailto:${COMPANY.supportEmail}`}>
              <Mail size={22} strokeWidth={1.5} aria-hidden="true" /><b>Email</b><span className="muted">{COMPANY.supportEmail} · we reply within 24 hours.</span>
            </a>
            <Link className="help-card" to="/privacy">
              <ShieldCheck size={22} strokeWidth={1.5} aria-hidden="true" /><b>Privacy & data</b><span className="muted">What we collect, and how to export or delete it.</span>
            </Link>
          </div>
          <TicketForm />
          <div className="help-grid">
            {HELP.map((g) => (
              <section key={g.title}>
                <h2 className="with-ic dash-h"><g.icon size={18} strokeWidth={1.75} aria-hidden="true" />{g.title}</h2>
                <div className="faq">
                  {g.items.map(([q, a]) => (
                    <details key={q}><summary>{q}<ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" /></summary><p className="muted">{a}</p></details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

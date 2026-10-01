// Mail. With SMTP_* set (see .env.example) messages are really sent via nodemailer;
// otherwise they're printed to the server console so every flow still works in dev.
import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env
const transport = SMTP_HOST
  ? nodemailer.createTransport({ host: SMTP_HOST, port: +SMTP_PORT || 465, secure: (+SMTP_PORT || 465) === 465, auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined })
  : null
export const MAIL_MODE = transport ? `smtp (${SMTP_HOST})` : 'console'

export async function send({ to, subject, text, replyTo }) {
  if (!to) return
  if (!transport) {
    console.log(`\n✉️  [mail] to=${to}\n    subject: ${subject}\n    ${text.replace(/\n/g, '\n    ')}\n`)
    return
  }
  try {
    await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, text, replyTo })
  } catch (e) {
    console.error('[mail] send failed:', e.message) // never break the request because email failed
  }
}
/** Notify the site admins (ADMIN_EMAILS — server-side only, never sent to the browser). */
export function notifyAdmins(subject, text) {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)
  return Promise.all(list.map((to) => send({ to, subject: `[BND Admin] ${subject}`, text })))
}

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Field({ label, error, help, aside, ...props }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}{aside}</label>
      <input id={id} className="input" aria-invalid={!!error} aria-describedby={error || help ? id + '-d' : undefined} {...props} />
      {(error || help) && <div id={id + '-d'} className={error ? 'field-error' : 'help'}>{error || help}</div>}
    </div>
  )
}

export function strength(pw = '') {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) s++
  if (/[^a-z0-9]/i.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++
  return pw ? Math.max(1, s) : 0
}
const LABEL = ['', 'Weak', 'Okay', 'Good', 'Strong']

export function PasswordField({ label = 'Password', error, meter, help, aside, ...props }) {
  const id = useId()
  const [show, setShow] = useState(false)
  const s = meter ? strength(props.value) : 0
  return (
    <div className="field">
      <label htmlFor={id}>{label}{aside}</label>
      <div className="input-wrap">
        <input id={id} className="input" type={show ? 'text' : 'password'} aria-invalid={!!error} aria-describedby={id + '-d'} {...props} />
        <button type="button" className="peek" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>{show ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}</button>
      </div>
      {meter && <div className="meter" data-s={s} aria-hidden="true"><i /><i /><i /><i /></div>}
      <div id={id + '-d'} className={error ? 'field-error' : 'help'}>
        {error || (meter && props.value ? `${LABEL[s]} · ` : '') + (help || '')}
      </div>
    </div>
  )
}

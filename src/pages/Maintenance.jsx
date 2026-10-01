import { Link } from 'react-router-dom'
import { SpiderMark } from '../components/Brand'
import { COMPANY } from '../content/film'

export default function Maintenance({ message }) {
  return (
    <main className="maint" id="main">
      <SpiderMark size={64} className="maint-mark" />
      <h1 className="h-2">Back in a flash</h1>
      <p className="lede muted">{message}</p>
      <p className="faint" style={{ fontSize: 13 }}>Questions? <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a> · <Link to="/login">Member log in</Link></p>
    </main>
  )
}

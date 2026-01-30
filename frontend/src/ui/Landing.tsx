import { Link } from 'react-router-dom'
import { NewsletterPopup } from './NewsletterPopup'

export function Landing() {
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, letterSpacing: -0.4 }}>Evernest</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/pricing">Pricing</Link>
            <Link to="/support">Support</Link>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Secure, zero-knowledge vaulting for your digital estate — so nothing important is lost. Store what matters, generate a
          recovery kit, and control heir handover with a built-in duty-of-care safeguard.
        </div>

        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Built to be there for the people you trust — without putting your data in ours.
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button type="button" className="primary">
              Sign In
            </button>
          </Link>
          <Link to="/pricing" style={{ textDecoration: 'none' }}>
            <button type="button">View Pricing</button>
          </Link>
          <Link to="/security" style={{ textDecoration: 'none' }}>
            <button type="button">Security Audit</button>
          </Link>
          <Link to="/terms" style={{ textDecoration: 'none' }}>
            <button type="button">Terms</button>
          </Link>
          <Link to="/privacy" style={{ textDecoration: 'none' }}>
            <button type="button">Privacy</button>
          </Link>
        </div>

        <div className="muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7 }}>
          <span>Zero-knowledge by design</span> · <span>Client-side encryption</span> ·{' '}
          <Link to="/security" style={{ opacity: 0.85 }}>
            Security details
          </Link>
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7 }}>
          For those who want the technical details, we publish our security design and limitations.
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6 }}>
          Evernest cannot reset your Vault Password. Recovery materials must be stored offline.
        </div>

        {contactEmail ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
            Contact:{' '}
            <a href={`mailto:${contactEmail}`} style={{ color: 'inherit' }}>
              {contactEmail}
            </a>
          </div>
        ) : null}
      </div>
      <NewsletterPopup contactEmail={contactEmail ?? null} />
    </div>
  )
}

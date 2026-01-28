import { Link } from 'react-router-dom'

export function Landing() {
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 22 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.4 }}>Evernest</h1>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Secure, zero-knowledge vaulting for your digital estate. Store what matters, generate a recovery kit, and control heir
          handover with a duty-of-care review.
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button type="button" className="primary">
              Sign In
            </button>
          </Link>
          <Link to="/pricing" style={{ textDecoration: 'none' }}>
            <button type="button">Pricing</button>
          </Link>
          <Link to="/security-audit" style={{ textDecoration: 'none' }}>
            <button type="button">Security Audit</button>
          </Link>
          <Link to="/terms" style={{ textDecoration: 'none' }}>
            <button type="button">Terms</button>
          </Link>
          <Link to="/privacy" style={{ textDecoration: 'none' }}>
            <button type="button">Privacy</button>
          </Link>
        </div>

        <div className="muted" style={{ marginTop: 16, fontSize: 13, lineHeight: 1.6 }}>
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
    </div>
  )
}

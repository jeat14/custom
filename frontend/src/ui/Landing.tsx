import { Link } from 'react-router-dom'

export function Landing() {
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 22 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 18,
            alignItems: 'stretch',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, letterSpacing: -0.6 }}>Evernest</h1>
              <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/how-it-works">How it works</Link>
                <Link to="/pricing">Pricing</Link>
                <Link to="/support">Support</Link>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 820, letterSpacing: -0.6, lineHeight: 1.12 }}>
                Prepare your digital life — so your family isn’t left guessing.
              </div>
              <div className="muted" style={{ marginTop: 10, lineHeight: 1.65, fontSize: 14 }}>
                UK-focused. Calm, practical digital estate planning: passwords, accounts, documents, and instructions — stored securely, designed
                for emergency and end-of-life access.
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link to="/digital-estate-planning" style={{ textDecoration: 'none' }}>
                <button type="button" className="primary">
                  Start the 2-minute self-check
                </button>
              </Link>
              <Link to="/how-it-works" style={{ textDecoration: 'none' }}>
                <button type="button">See how it works</button>
              </Link>
              <Link to="/login" style={{ textDecoration: 'none', fontSize: 13, color: 'inherit', opacity: 0.9 }}>
                Sign in
              </Link>
            </div>

            <div className="muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>Zero-knowledge</span> — we can’t access your vault data.{' '}
              <Link to="/security" style={{ opacity: 0.9 }}>
                Security details
              </Link>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: 16,
              background: 'linear-gradient(135deg, rgba(15,58,43,0.10), rgba(15,58,43,0.03))',
              border: '1px solid rgba(17,24,39,0.10)',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.1 }}>A simple way to get organised</div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>
              Three steps, designed for real estate planning scenarios — without complexity.
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.1 }}>1) Store what matters</div>
                <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                  Passwords, documents, and instructions — encrypted client-side.
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.1 }}>2) Generate a recovery kit</div>
                <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                  Keep offline materials for the moment they’re needed.
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.1 }}>3) Control heir handover</div>
                <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                  A built-in safeguard reduces accidental or premature access.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, lineHeight: 1.6 }}>
          <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Why this exists</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7 }}>
            Digital lives are messy. Passwords, accounts, subscriptions — none of it is designed to be handed over. Ignoring this problem can
            create stress for families when they least need it.
          </div>
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
    </div>
  )
}

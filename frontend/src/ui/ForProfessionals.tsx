import { Link } from 'react-router-dom'

export function ForProfessionals() {
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Evernest for Professionals</h1>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Secure digital estate vaulting for firms and organisations supporting clients and employees.
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Law firms & estate planners</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              Help clients organise critical digital documents, credentials, and recovery materials with a clear offline recovery
              workflow.
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Corporate benefits</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              Offer a high-trust digital estate plan as an employee benefit, with privacy-first controls and simple setup.
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Family offices & advisers</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              Reduce operational risk by standardising what’s stored, how it’s recovered, and who can access it.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, lineHeight: 1.6 }}>
          <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Why Evernest</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            Zero-knowledge by design, client-side encryption, and a duty-of-care safeguard for heir handover.
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/security" style={{ textDecoration: 'none' }}>
            <button type="button">Security Audit</button>
          </Link>
          <Link to="/how-it-works" style={{ textDecoration: 'none' }}>
            <button type="button">How it works</button>
          </Link>
          <Link to="/pricing" style={{ textDecoration: 'none' }}>
            <button type="button">Pricing</button>
          </Link>
          {contactEmail ? (
            <a href={`mailto:${contactEmail}`} style={{ textDecoration: 'none' }}>
              <button type="button" className="primary">
                Contact
              </button>
            </a>
          ) : null}
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>
          <Link to="/">Back to homepage</Link>
        </div>
      </div>
    </div>
  )
}


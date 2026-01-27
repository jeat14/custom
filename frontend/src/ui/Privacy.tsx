import { Link } from 'react-router-dom'

export function Privacy() {
  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Privacy Policy</h1>
        <div className="muted" style={{ marginTop: 8 }}>
          This policy describes how Evernest processes personal data and how it protects vault contents using a zero-knowledge
          architecture.
        </div>

        <div style={{ marginTop: 14, lineHeight: 1.6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>1) What we collect</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Account identifiers (email, user ID), basic metadata needed to operate the service, and encrypted vault data that you
            store.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>2) Zero-knowledge vault contents</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Vault contents are encrypted in your browser before they are stored. Evernest does not store your Vault Password and
            cannot reset it. If you forget it and lose your recovery materials, your data may be permanently inaccessible.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>3) Proof documents</div>
          <div className="muted" style={{ marginTop: 6 }}>
            If an heir submits proof documents (e.g. a death certificate), those files are stored in a private bucket and reviewed
            only for verification and fraud prevention purposes.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>4) Emails</div>
          <div className="muted" style={{ marginTop: 6 }}>
            We send operational emails (magic links, verification updates, and reminders). Email delivery providers process your
            email address and message metadata to deliver these messages.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>5) Payments</div>
          <div className="muted" style={{ marginTop: 6 }}>
            If you purchase a paid plan, payments are processed by Stripe. Evernest does not store your full payment card details.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>6) Legal bases and rights</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Where applicable, Evernest processes personal data under contract necessity, legitimate interests (security and fraud
            prevention), and consent where required. You may have rights under GDPR and CCPA/CPRA, including access, deletion,
            correction, and portability, subject to legal limitations.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>7) Retention</div>
          <div className="muted" style={{ marginTop: 6 }}>
            We retain data only as long as needed to operate the service, comply with legal obligations, and maintain security and
            audit trails for verification decisions.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>8) Contact</div>
          <div className="muted" style={{ marginTop: 6 }}>
            For privacy questions or requests, use <Link to="/support">Support</Link>.
          </div>
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13, display: 'flex', gap: 12 }}>
          <Link to="/terms">Terms</Link>
          <Link to="/support">Support</Link>
        </div>
      </div>
    </div>
  )
}

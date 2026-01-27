import { Link } from 'react-router-dom'

export function Support() {
  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Support</h1>
        <div className="muted" style={{ marginTop: 8 }}>
          High-trust services must be clear about what can and cannot be recovered.
        </div>

        <div style={{ marginTop: 14, lineHeight: 1.6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>If you forgot your Vault Password</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Evernest cannot reset or recover your Vault Password. Use your Emergency Recovery Kit (Recovery Master Key) to regain
            access.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>If you are an heir</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Access requires manual review of submitted proof documents. If your request is rejected, you will receive a reason
            and can re-submit with corrected documentation.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Security best practices</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Do not screenshot keys, email them, or store them in cloud notes. Prefer printed copies sealed in envelopes stored in
            separate physical safes.
          </div>
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
    </div>
  )
}


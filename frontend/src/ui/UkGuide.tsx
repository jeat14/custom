import { Link } from 'react-router-dom'

export function UkGuide() {
  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <div className="card" style={{ padding: 20 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Free UK guide</h1>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Protect your important digital documents with a simple checklist you can do in one sitting.
        </div>

        <div style={{ marginTop: 16, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 750, letterSpacing: -0.2 }}>10-minute checklist</div>
          <ul style={{ marginTop: 8 }}>
            <li>Write down where your important accounts live (banking, email, phone, utilities).</li>
            <li>List what your family would need quickly (IDs, insurance, wills, property, subscriptions).</li>
            <li>Store recovery codes and device PINs safely offline (not in a shared email).</li>
            <li>Decide who you trust and what they should receive (and when).</li>
            <li>Keep a printed “where to find things” page in a safe place.</li>
          </ul>
        </div>

        <div className="muted" style={{ marginTop: 16, lineHeight: 1.7 }}>
          Want a secure place to store and pass on this information? Evernest helps families keep important digital details safe and accessible
          when they’re needed.
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/how-it-works" style={{ textDecoration: 'none' }}>
            <button type="button" className="primary">
              How it works
            </button>
          </Link>
          <Link to="/pricing" style={{ textDecoration: 'none' }}>
            <button type="button">View Pricing</button>
          </Link>
          <Link to="/support" style={{ textDecoration: 'none' }}>
            <button type="button">Contact Support</button>
          </Link>
        </div>
      </div>
    </div>
  )
}


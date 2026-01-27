import { Link } from 'react-router-dom'

export function Terms() {
  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Terms of Service (Draft)</h1>
        <div className="muted" style={{ marginTop: 8 }}>
          Evernest is a technical vault provider. It is not a law firm and does not provide legal advice.
        </div>

        <div style={{ marginTop: 14, lineHeight: 1.6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>1) Zero-knowledge design</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Your Vault Password is not stored by Evernest. Evernest cannot reset it. If you lose it and you do not have your
            Recovery Master Key, your data may be permanently inaccessible.
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Your vault contents are encrypted client-side; Evernest cannot read your plaintext vault data without your secret
            material.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>2) No executor relationship</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Evernest does not act as an executor, fiduciary, probate attorney, or estate administrator. You are responsible for
            ensuring your use of Evernest is compatible with applicable laws and your personal estate plan.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>3) Duty-of-care review</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Heir access requires human verification of claims in addition to automated timing logic. Approval or rejection may
            require additional documentation and can take time.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>4) Limitation of liability</div>
          <div className="muted" style={{ marginTop: 6 }}>
            To the maximum extent permitted by law, Evernest is not liable for loss of access caused by forgotten passwords,
            lost recovery kits, compromised devices, misdirected emails, or user error.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>5) Compliance notice</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Evernest aims to follow applicable privacy and consumer protection laws, including GDPR and CCPA/CPRA, where they
            apply. See Privacy for details on processing and user rights.
          </div>
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13, display: 'flex', gap: 12 }}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/support">Support</Link>
        </div>
      </div>
    </div>
  )
}

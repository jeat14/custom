import { Link } from 'react-router-dom'

export function Terms() {
  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Terms of Service</h1>
        <div className="muted" style={{ marginTop: 8 }}>
          These Terms govern your access to and use of Evernest. Evernest is a technical vault provider and does not provide legal
          advice.
        </div>

        <div style={{ marginTop: 14, lineHeight: 1.6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>1) Acceptance of these Terms</div>
          <div className="muted" style={{ marginTop: 6 }}>
            By using Evernest, you agree to these Terms and to our <Link to="/privacy">Privacy Policy</Link>. If you do not agree,
            do not use Evernest.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>2) Eligibility and accounts</div>
          <div className="muted" style={{ marginTop: 6 }}>
            You must be legally able to enter into these Terms. You are responsible for maintaining the security of your account
            and for all activity under your account.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>3) Zero-knowledge encryption</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Evernest encrypts vault contents in your browser before storage. Evernest does not store your Vault Password and cannot
            reset it. If you forget it and do not have your Emergency Recovery Kit, your vault contents may be permanently
            inaccessible.
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            You are responsible for choosing a strong Vault Password, securing your devices, and safeguarding your recovery
            materials. Do not share recovery materials by email or cloud notes.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>4) Heir handover and verification</div>
          <div className="muted" style={{ marginTop: 6 }}>
            If you use heir handover features, access can require manual review of proof documents and other checks. Approvals and
            rejections may require additional documentation and can take time. Evernest does not act as an executor, fiduciary,
            probate attorney, or estate administrator.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>5) Paid plans, billing, and cancellation</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Paid plans are billed in advance and renew automatically until cancelled. Payments are processed by Stripe and your
            payment details are handled by Stripe, not stored by Evernest. You can cancel your subscription at any time through
            the billing portal. Unless required by law, payments are non-refundable and we do not provide refunds for partial
            billing periods.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>6) Acceptable use</div>
          <div className="muted" style={{ marginTop: 6 }}>
            You agree not to misuse Evernest, including attempting to bypass security, probe or scan systems, interfere with the
            service, or use Evernest for unlawful activity. You are responsible for the content you store and for ensuring you have
            the right to store and share it.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>7) Service availability</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Evernest may change, suspend, or discontinue features, and may perform maintenance that impacts availability. We do not
            guarantee uninterrupted access.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>8) Disclaimers</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Evernest is provided “as is” and “as available”. To the maximum extent permitted by law, we disclaim all warranties of
            any kind, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>9) Limitation of liability</div>
          <div className="muted" style={{ marginTop: 6 }}>
            To the maximum extent permitted by law, Evernest is not liable for loss of access caused by forgotten passwords, lost
            recovery kits, compromised devices, misdirected emails, third-party failures, or user error. Nothing in these Terms
            limits liability where it cannot be limited under applicable law.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>10) Termination</div>
          <div className="muted" style={{ marginTop: 6 }}>
            You may stop using Evernest at any time. We may suspend or terminate access if we reasonably believe you violated these
            Terms or used Evernest unlawfully, or to protect the security of the service.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>11) Changes to these Terms</div>
          <div className="muted" style={{ marginTop: 6 }}>
            We may update these Terms from time to time. If changes are material, we will take reasonable steps to notify you. Your
            continued use of Evernest after changes take effect means you accept the updated Terms.
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>12) Contact</div>
          <div className="muted" style={{ marginTop: 6 }}>
            For help and billing questions, visit <Link to="/support">Support</Link>.
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

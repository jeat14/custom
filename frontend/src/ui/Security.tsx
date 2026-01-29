export function Security() {
  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Security</h1>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
          Evernest is designed so the server stores encrypted vault data and cannot decrypt your entries without your secret
          material. This page explains the encryption model in plain language first, then the technical details.
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>At a glance</div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.7, display: 'grid', gap: 10 }}>
          <div>
            <strong>Encrypted by default:</strong> vault contents are encrypted in your browser before being stored.
          </div>
          <div>
            <strong>Zero‑knowledge intent:</strong> Evernest does not store your Vault Password and cannot reset it.
          </div>
          <div>
            <strong>Recoverable:</strong> you generate recovery materials and store them offline.
          </div>
          <div>
            <strong>Heir access is gated:</strong> handover requests go through a duty‑of‑care safeguard to prevent abuse.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Encryption model (technical)</div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          <div>
            <strong>Vault encryption:</strong> AES‑256‑GCM with associated data bound to the vault ID.
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Password key derivation:</strong> PBKDF2 (SHA‑256), client‑side, using stored KDF parameters (salt + iterations).
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Default KDF work factor:</strong> 600,000 iterations (configurable per vault).
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Heir handover share protection:</strong> server‑gated share + heir‑encrypted share package (ECDH P‑256 + HKDF‑SHA‑256 + AES‑GCM).
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>What the server stores</div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          <div>Encrypted vault contents (ciphertext)</div>
          <div>KDF parameters required to derive keys locally (salt + iterations)</div>
          <div>Encrypted wrapped key material required to decrypt (never plaintext)</div>
          <div>For heirs: a server‑gated share (insufficient alone) and an heir‑encrypted share package</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>What the server never receives</div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          <div>Your Vault Password</div>
          <div>Your decrypted vault content</div>
          <div>Your plaintext recovery keys</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Duty‑of‑care safeguard</div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          <div>Automation can mark a vault as released after inactivity thresholds (dead‑man switch).</div>
          <div>Even after release, access is blocked until an admin manually approves verification (proof review + audit trail).</div>
          <div>Admin access is allowlisted and RLS gates enforce that only approved heirs can read gated rows.</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Limitations</div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          <div>If a device/browser is compromised, client‑side security can be bypassed.</div>
          <div>If both Vault Password and recovery materials are lost, the vault cannot be decrypted (by design).</div>
          <div>Users are responsible for securely storing recovery materials offline.</div>
        </div>
      </div>
    </div>
  )
}


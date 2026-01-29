export function SecurityAudit() {
  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Security Audit (Self-Audit)</h1>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Evernest is designed so the server stores encrypted vault data and cannot decrypt your entries without your secret
          material. This page summarizes the current implementation.
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Cryptography</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
          <div>
            <strong>Vault encryption:</strong> AES-256-GCM with associated data bound to the vault ID.
          </div>
          <div>
            <strong>Password key derivation:</strong> PBKDF2 (SHA-256), client-side, using stored KDF parameters (salt + iterations).
          </div>
          <div>
            <strong>Default KDF work factor:</strong> 600,000 iterations (configurable per vault).
          </div>
          <div>
            <strong>Heir handover share protection:</strong> server-gated share + heir-encrypted share (ECDH P-256 + HKDF-SHA-256 + AES-GCM).
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>What the server stores</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
          <div>Encrypted vault contents (ciphertext)</div>
          <div>KDF parameters required to derive keys locally (salt + iterations)</div>
          <div>Encrypted wrapped key material required to decrypt (never plaintext)</div>
          <div>For heirs: a server-gated share (insufficient alone) and an heir-encrypted share package</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>What the server never receives</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
          <div>Your Vault Password</div>
          <div>Your decrypted vault content</div>
          <div>Your plaintext recovery keys</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Duty-of-care safeguard</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
          <div>Automation can mark a vault as released after inactivity thresholds (dead-man switch).</div>
          <div>
            Even after release, access is blocked until an admin manually approves verification (proof review + audit trail).
          </div>
          <div>Admin access is allowlisted and RLS gates enforce that only approved heirs can read gated rows.</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Limitations</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
          <div>If a device/browser is compromised, client-side security can be bypassed.</div>
          <div>If both Vault Password and recovery materials are lost, the vault cannot be decrypted (by design).</div>
          <div>Users are responsible for securely storing recovery materials offline.</div>
        </div>
      </div>
    </div>
  )
}

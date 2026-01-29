export function Security() {
  return (
    <div
      style={{
        padding: 24,
        background: 'radial-gradient(900px 500px at 20% 0%, rgba(34, 197, 94, 0.12), transparent 55%), #070f1b',
        minHeight: 'calc(100vh - 120px)',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div
          style={{
            borderRadius: 22,
            border: '1px solid rgba(255, 255, 255, 0.10)',
            background: 'linear-gradient(180deg, #0b1628 0%, #081221 100%)',
            padding: 18,
            boxShadow: '0 30px 70px rgba(2, 6, 23, 0.35)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, letterSpacing: -0.4, color: 'rgba(255, 255, 255, 0.96)' }}>Security Audit</h1>
            <div
              style={{
                display: 'inline-flex',
                gap: 10,
                alignItems: 'center',
                borderRadius: 999,
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.72)',
                fontSize: 12,
              }}
            >
              Educate-first, plain language, then details
            </div>
          </div>

          <div style={{ marginTop: 10, lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.78)', fontSize: 13 }}>
            Evernest is built so your vault contents are encrypted before they leave your browser. The server stores ciphertext and
            encryption parameters, but it does not store your Vault Password and cannot reset it.
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
            {[
              { href: '#overview', label: 'Overview' },
              { href: '#model', label: 'Encryption Model' },
              { href: '#handover', label: 'Heir Handover' },
              { href: '#limitations', label: 'Limitations' },
            ].map((i) => (
              <a
                key={i.href}
                href={i.href}
                style={{
                  color: 'rgba(255, 255, 255, 0.78)',
                  textDecoration: 'none',
                  borderRadius: 999,
                  padding: '6px 10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                {i.label}
              </a>
            ))}
          </div>
        </div>

        <div id="overview" style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.10)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1, color: 'rgba(255, 255, 255, 0.86)' }}>At a glance</div>
            <div style={{ marginTop: 10, lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.72)', fontSize: 13, display: 'grid', gap: 8 }}>
              <div>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>Encrypted by default:</strong> vault entries are encrypted in your browser.
              </div>
              <div>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>No password escrow:</strong> Evernest does not store your Vault Password and cannot reset it.
              </div>
              <div>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>Responsible recovery:</strong> you generate recovery materials and store them offline.
              </div>
              <div>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>Heir access is gated:</strong> handover requests go through a duty-of-care safeguard.
              </div>
            </div>
          </div>
        </div>

        <div id="model" style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.10)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1, color: 'rgba(255, 255, 255, 0.86)' }}>Encryption model</div>
            <div style={{ marginTop: 10, lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.72)', fontSize: 13 }}>
              <div style={{ marginBottom: 10 }}>
                The following section explains how encryption works for those who want technical specifics.
              </div>
              <div>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>Content encryption:</strong> AES‑GCM using a 256‑bit key, with a 12‑byte random IV per encryption.
              </div>
              <div style={{ marginTop: 8 }}>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>Vault binding (AAD):</strong> encrypted blobs include associated data like <span style={{ color: 'rgba(255, 255, 255, 0.82)' }}>vault:&lt;vaultId&gt;</span> so data can’t be silently swapped between vaults.
              </div>
              <div style={{ marginTop: 8 }}>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>Password → key derivation:</strong> PBKDF2 (SHA‑256) runs client‑side using stored parameters (16‑byte salt + iterations).
              </div>
              <div style={{ marginTop: 8 }}>
                <strong style={{ color: 'rgba(255, 255, 255, 0.88)' }}>Default work factor:</strong> 600,000 PBKDF2 iterations (per‑vault configurable).
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.10)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1, color: 'rgba(255, 255, 255, 0.86)' }}>What the server stores</div>
            <div style={{ marginTop: 10, lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.72)', fontSize: 13 }}>
              <div>Encrypted vault contents (ciphertext)</div>
              <div>Encryption parameters required for local derivation and decryption (salt, iterations, IVs)</div>
              <div>Encrypted key material required to decrypt (never plaintext)</div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.10)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1, color: 'rgba(255, 255, 255, 0.86)' }}>What the server never receives</div>
            <div style={{ marginTop: 10, lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.72)', fontSize: 13 }}>
              <div>Your Vault Password</div>
              <div>Your decrypted vault content</div>
              <div>Plaintext recovery keys</div>
            </div>
          </div>
        </div>

        <div id="handover" style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.10)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1, color: 'rgba(255, 255, 255, 0.86)' }}>Heir handover (duty‑of‑care safeguard)</div>
            <div style={{ marginTop: 10, lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.72)', fontSize: 13 }}>
              <div>Automation can mark a vault as released after inactivity thresholds (dead‑man switch).</div>
              <div style={{ marginTop: 8 }}>
                Even after release, access is blocked until an admin manually approves verification (proof review + audit trail).
              </div>
              <div style={{ marginTop: 8 }}>
                For the cryptography: heir shares are protected with ECDH on P‑256, then HKDF‑SHA‑256 derives an AES‑GCM key used to encrypt the share package.
              </div>
            </div>
          </div>
        </div>

        <div id="limitations" style={{ marginTop: 12 }}>
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.10)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1, color: 'rgba(255, 255, 255, 0.86)' }}>Limitations</div>
            <div style={{ marginTop: 10, lineHeight: 1.75, color: 'rgba(255, 255, 255, 0.72)', fontSize: 13 }}>
              <div>If a device or browser is compromised, client‑side encryption can be bypassed.</div>
              <div style={{ marginTop: 8 }}>
                If you lose your Vault Password and offline recovery materials, your data cannot be recovered (by design).
              </div>
              <div style={{ marginTop: 8 }}>Evernest cannot verify the correctness of information you store in your vault.</div>
              <div style={{ marginTop: 8 }}>Users are responsible for securely storing recovery materials offline.</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, lineHeight: 1.6 }}>
          This page describes the current security design and its limits. If you spot an issue, please report it responsibly.
        </div>
      </div>
    </div>
  )
}

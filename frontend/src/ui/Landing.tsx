import { Link } from 'react-router-dom'

export function Landing() {
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail

  return (
    <div style={{ padding: 24, maxWidth: 1040, margin: '0 auto' }}>
      <div
        style={{
          borderRadius: 26,
          border: '1px solid rgba(15, 23, 42, 0.22)',
          background: 'linear-gradient(180deg, #0b1220 0%, #07111f 60%, #070f1b 100%)',
          boxShadow: '0 40px 90px rgba(2, 6, 23, 0.24)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 999,
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.82)',
                fontSize: 12,
                letterSpacing: -0.1,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(34, 197, 94, 0.9)' }} />
              Secure digital vault
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link to="/security" style={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                Security
              </Link>
              <Link to="/pricing" style={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                Pricing
              </Link>
              <Link to="/support" style={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                Support
              </Link>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 18,
              alignItems: 'stretch',
            }}
          >
            <div>
              <h1 style={{ margin: 0, letterSpacing: -0.7, fontSize: 44, color: 'rgba(255, 255, 255, 0.96)' }}>Evernest</h1>
              <div style={{ marginTop: 10, lineHeight: 1.45, fontSize: 18, color: 'rgba(255, 255, 255, 0.86)' }}>
                Secure, zero‑knowledge vaulting for your digital estate — so nothing important is lost.
              </div>
              <div style={{ marginTop: 10, lineHeight: 1.65, fontSize: 14, color: 'rgba(255, 255, 255, 0.72)' }}>
                Encrypt in your browser, store safely, generate an offline recovery kit, and control heir handover with a built‑in
                duty‑of‑care safeguard.
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <button type="button" className="primary">
                    Start Free
                  </button>
                </Link>
                <Link to="/security" style={{ textDecoration: 'none' }}>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      boxShadow: 'none',
                    }}
                  >
                    Read Security
                  </button>
                </Link>
                <Link to="/pricing" style={{ textDecoration: 'none' }}>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      boxShadow: 'none',
                    }}
                  >
                    View Pricing
                  </button>
                </Link>
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap', color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
                <div>Zero‑knowledge by design</div>
                <div>Client‑side key derivation</div>
                <div>Encrypted vaults stored server‑side</div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                padding: 16,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: -0.1, fontWeight: 750, color: 'rgba(255, 255, 255, 0.86)' }}>What we protect</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 10, fontSize: 13, color: 'rgba(255, 255, 255, 0.76)', lineHeight: 1.5 }}>
                <div>Accounts, recovery notes, PINs, and instructions your loved ones would need.</div>
                <div>Heir access is gated by verification to prevent abuse.</div>
                <div>Evernest cannot reset your Vault Password or decrypt your vault contents.</div>
              </div>
              {contactEmail ? (
                <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255, 255, 255, 0.65)' }}>
                  Questions?{' '}
                  <a href={`mailto:${contactEmail}`} style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    {contactEmail}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.10)', padding: 18, background: 'rgba(255, 255, 255, 0.03)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {[
              { title: '1) Encrypt locally', text: 'Your vault is encrypted in your browser before it’s stored.' },
              { title: '2) Store safely', text: 'The server stores ciphertext plus parameters required to derive keys.' },
              { title: '3) Recover responsibly', text: 'Offline recovery kit + duty-of-care safeguard for heir access.' },
            ].map((s) => (
              <div
                key={s.title}
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1, color: 'rgba(255, 255, 255, 0.88)' }}>
                  {s.title}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.7)' }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

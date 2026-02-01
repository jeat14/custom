import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function ShieldIcon(props: { tone?: 'ok' | 'warn' }) {
  const tone = props.tone ?? 'ok'
  const fill = tone === 'warn' ? 'rgba(201, 163, 91, 0.22)' : 'rgba(31, 61, 43, 0.18)'
  const stroke = tone === 'warn' ? 'rgba(201, 163, 91, 0.55)' : 'rgba(31, 61, 43, 0.55)'
  return (
    <span
      aria-hidden="true"
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: fill,
        border: `1px solid ${stroke}`,
        flex: '0 0 auto',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z"
          stroke={tone === 'warn' ? 'rgba(201, 163, 91, 0.95)' : 'rgba(31, 61, 43, 0.95)'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M8 12l2.3 2.3L16 8.6"
          stroke={tone === 'warn' ? 'rgba(201, 163, 91, 0.95)' : 'rgba(31, 61, 43, 0.95)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function SecurityBadge(props: { label: string; detail: string; tone?: 'ok' | 'warn' }) {
  return (
    <span
      className="pill"
      style={{
        fontSize: 12,
        gap: 10,
        padding: '8px 10px',
        borderColor: 'rgba(31, 41, 55, 0.12)',
        background: 'rgba(255, 255, 255, 0.8)',
      }}
    >
      <ShieldIcon tone={props.tone} />
      <span style={{ display: 'grid', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 800, letterSpacing: -0.1 }}>{props.label}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {props.detail}
        </span>
      </span>
    </span>
  )
}

function DemoPanel(props: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderRadius: 18,
        border: '1px solid rgba(31, 41, 55, 0.10)',
        background: 'rgba(255, 255, 255, 0.82)',
        boxShadow: '0 18px 46px rgba(17, 24, 39, 0.10)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.1 }}>{props.title}</div>
        <span className="pill" style={{ fontSize: 12 }}>
          Preview
        </span>
      </div>
      <div style={{ marginTop: 12 }}>{props.children}</div>
    </div>
  )
}

export function HowItWorks() {
  const navigate = useNavigate()
  const demoVideoSrc = '/how-it-works-demo.mp4'
  const demoVideoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = demoVideoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((e) => e.isIntersecting)
        if (isVisible) {
          void el.play().catch(() => {})
          return
        }
        el.pause()
      },
      { threshold: 0.35 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, letterSpacing: -0.4 }}>How it works</h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to="/security" style={{ opacity: 0.85 }}>
              Security details
            </Link>
            <Link to="/pricing" style={{ textDecoration: 'none' }}>
              <button type="button">View Pricing</button>
            </Link>
            <button type="button" className="primary" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          Evernest is built for one outcome: if something happens to you, your family can safely recover what matters without you having to
          share passwords while you’re alive.
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
              <div>
                <div className="pill" style={{ fontSize: 12 }}>
                  Step 1
                </div>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>Secure your legacy</div>
                <div className="muted" style={{ marginTop: 8, lineHeight: 1.7, fontSize: 13 }}>
                  Add the accounts, documents, and instructions your family would struggle to find. Everything is encrypted before it leaves
                  your browser.
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <SecurityBadge label="Zero-knowledge" detail="Your password never leaves your device" />
                  <SecurityBadge label="AES-256" detail="AES-GCM encryption for stored vault entries" />
                  <SecurityBadge label="Client-side crypto" detail="Encrypt before upload, decrypt locally" />
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span className="pill" style={{ fontSize: 12 }}>
                    Private by design
                  </span>
                  <span className="pill" style={{ fontSize: 12 }}>
                    Fast to update
                  </span>
                  <span className="pill" style={{ fontSize: 12 }}>
                    One place to maintain
                  </span>
                </div>
              </div>

              <DemoPanel title="Vault entry">
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Label
                      </div>
                      <div className="pill" style={{ marginTop: 6, width: '100%', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Bank account</span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          Encrypted
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Type
                      </div>
                      <div className="pill" style={{ marginTop: 6, width: '100%', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Credentials</span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          AES‑GCM
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Notes (stored encrypted)
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        borderRadius: 14,
                        border: '1px solid var(--border)',
                        background: 'rgba(255, 255, 255, 0.6)',
                        padding: 10,
                        fontSize: 12,
                        lineHeight: 1.55,
                      }}
                    >
                      Routing number, account number, and where to find statements.
                    </div>
                  </div>
                </div>
              </DemoPanel>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
            <div>
              <div className="pill" style={{ fontSize: 12 }}>
                Step 2
              </div>
              <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>Duty-of-care guard</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.7, fontSize: 13 }}>
                You decide how long you can go without checking in. If you stop checking in, Evernest begins a safe, documented process
                instead of instantly handing everything over.
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <div className="statusBar">
                  <div className="statusLeft">
                    <span className={['statusDot', 'ok'].join(' ')} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>Check-in window</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        You’re in control
                      </div>
                    </div>
                  </div>
                  <span className="pill" style={{ fontSize: 12 }}>
                    30 days
                  </span>
                </div>
                <div className="statusBar">
                  <div className="statusLeft">
                    <span className={['statusDot', 'warn'].join(' ')} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>If you miss it</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Escalates safely
                      </div>
                    </div>
                  </div>
                  <span className="pill" style={{ fontSize: 12 }}>
                    reminders → review
                  </span>
                </div>
              </div>
            </div>

            <DemoPanel title="Timeline">
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Day 0', text: 'Everything normal', tone: 'ok' },
                  { label: 'Day 30', text: 'Check-in missed → reminders start', tone: 'warn' },
                  { label: 'Later', text: 'Heir can request access (verification required)', tone: 'warn' },
                ].map((r) => (
                  <div key={r.label} className="statusBar">
                    <div className="statusLeft">
                      <span className={['statusDot', r.tone].join(' ')} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{r.label}</div>
                        <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.text}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DemoPanel>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
            <div>
              <div className="pill" style={{ fontSize: 12 }}>
                Step 3
              </div>
              <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>Heir handover</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.7, fontSize: 13 }}>
                When it’s time, your heir can access the vault only after a duty-of-care verification. This prevents instant compromise and
                creates an audit trail.
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="pill" style={{ fontSize: 12 }}>
                  Verification required
                </span>
                <span className="pill" style={{ fontSize: 12 }}>
                  Audit trail
                </span>
                <span className="pill" style={{ fontSize: 12 }}>
                  Controlled release
                </span>
              </div>
            </div>

            <DemoPanel title="Handover view">
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="statusBar">
                  <div className="statusLeft">
                    <span className={['statusDot', 'warn'].join(' ')} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>Request submitted</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Proof required
                      </div>
                    </div>
                  </div>
                </div>
                <div className="statusBar">
                  <div className="statusLeft">
                    <span className={['statusDot', 'warn'].join(' ')} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>Admin review</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Document check
                      </div>
                    </div>
                  </div>
                </div>
                <div className="statusBar">
                  <div className="statusLeft">
                    <span className={['statusDot', 'ok'].join(' ')} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>Access granted</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Time to recover
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DemoPanel>
          </div>
        </div>

        <div className="card" style={{ padding: 18, backdropFilter: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: -0.2 }}>10-second demo</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.65, fontSize: 13 }}>
                A quick walkthrough of the experience.
              </div>
            </div>
            <span className="pill" style={{ fontSize: 12 }}>
              Video
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <video
              muted
              loop
              controls
              playsInline
              preload="none"
              ref={demoVideoRef}
              style={{
                width: '100%',
                borderRadius: 18,
                border: '1px solid rgba(31, 41, 55, 0.12)',
                background: 'rgba(17, 24, 39, 0.06)',
                boxShadow: '0 18px 46px rgba(17, 24, 39, 0.10)',
              }}
            >
              <source src={demoVideoSrc} type="video/mp4" />
            </video>
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6 }}>
            If the video doesn’t play,{' '}
            <a href={demoVideoSrc} target="_blank" rel="noreferrer">
              open it in a new tab
            </a>
            .
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: -0.2 }}>Your recovery kit</div>
            <span className="pill" style={{ fontSize: 12 }}>
              Store offline
            </span>
          </div>
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Important</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.65, fontSize: 13 }}>
              Evernest cannot reset your Vault Password. Your recovery kit is your emergency key and must be stored offline (printed or kept in
              a secure physical place).
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="pill" style={{ fontSize: 12 }}>
              Print it
            </span>
            <span className="pill" style={{ fontSize: 12 }}>
              Store separately
            </span>
            <span className="pill" style={{ fontSize: 12 }}>
              Update if you change your vault
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: -0.2 }}>Get set up in minutes</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.65, fontSize: 13 }}>
                Start small: add one account, generate your recovery kit, and invite your heir.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/pricing" style={{ textDecoration: 'none' }}>
                <button type="button">View Pricing</button>
              </Link>
              <button type="button" className="primary" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.6 }}>
        Want deeper details? Read the <Link to="/security">Security Audit</Link>.
      </div>
    </div>
  )
}

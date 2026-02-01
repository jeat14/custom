import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { NewsletterPopup } from './NewsletterPopup'

export function Landing() {
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail
  const demoVideoSrc = '/how-it-works-demo.mp4'
  const demoVideoRef = useRef<HTMLVideoElement | null>(null)
  const userEnabledSoundRef = useRef(false)
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    const el = demoVideoRef.current
    if (!el) return
    el.muted = true
    setIsMuted(true)
    void el.play().catch(() => {})
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, letterSpacing: -0.4 }}>Evernest</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/support">Support</Link>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Secure, zero-knowledge vaulting for your digital estate — so nothing important is lost. Store what matters, generate a
          recovery kit, and control heir handover with a built-in duty-of-care safeguard.
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: -0.2 }}>
            See how Evernest secures your most important digital assets in seconds
          </div>
          <div style={{ marginTop: 12, position: 'relative' }}>
            <video
              muted={isMuted}
              loop
              controls
              playsInline
              preload="metadata"
              ref={demoVideoRef}
              onVolumeChange={(e) => {
                const el = e.currentTarget
                const nowMuted = Boolean(el.muted) || el.volume === 0
                setIsMuted(nowMuted)
                if (!nowMuted) userEnabledSoundRef.current = true
              }}
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
            <button
              type="button"
              onClick={() => {
                const el = demoVideoRef.current
                if (!el) return
                if (el.muted || el.volume === 0) {
                  el.pause()
                  el.muted = false
                  el.volume = 1
                  userEnabledSoundRef.current = true
                  setIsMuted(false)
                  void el.play().catch(() => {})
                  return
                }
                el.muted = true
                userEnabledSoundRef.current = false
                setIsMuted(true)
              }}
              className="pill"
              style={{
                position: 'absolute',
                right: 10,
                top: 10,
                padding: '8px 10px',
                fontSize: 12,
                boxShadow: 'var(--shadow-soft)',
                zIndex: 3,
              }}
            >
              {isMuted ? 'Sound: Off' : 'Sound: On'}
            </button>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Built to be there for the people you trust — without putting your data in ours.
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button type="button" className="primary">
              Sign In
            </button>
          </Link>
          <Link to="/how-it-works" style={{ textDecoration: 'none' }}>
            <button type="button">How it works</button>
          </Link>
          <Link to="/pricing" style={{ textDecoration: 'none' }}>
            <button type="button">View Pricing</button>
          </Link>
          <Link to="/security" style={{ textDecoration: 'none' }}>
            <button type="button">Security Audit</button>
          </Link>
          <Link to="/terms" style={{ textDecoration: 'none' }}>
            <button type="button">Terms</button>
          </Link>
          <Link to="/privacy" style={{ textDecoration: 'none' }}>
            <button type="button">Privacy</button>
          </Link>
        </div>

        <div className="muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7 }}>
          <span>Zero-knowledge by design</span> · <span>Client-side encryption</span> ·{' '}
          <Link to="/security" style={{ opacity: 0.85 }}>
            Security details
          </Link>
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7 }}>
          For those who want the technical details, we publish our security design and limitations.
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6 }}>
          Evernest cannot reset your Vault Password. Recovery materials must be stored offline.
        </div>

        {contactEmail ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
            Contact:{' '}
            <a href={`mailto:${contactEmail}`} style={{ color: 'inherit' }}>
              {contactEmail}
            </a>
          </div>
        ) : null}
      </div>
      <NewsletterPopup contactEmail={contactEmail ?? null} />
    </div>
  )
}

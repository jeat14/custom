import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { NewsletterPopup } from './NewsletterPopup'

export function Landing() {
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail
  const trustpilotRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const scriptSrc = 'https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js'
    const existing = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement | null

    const loadWidget = () => {
      const api = (window as any).Trustpilot
      if (api?.loadFromElement && trustpilotRef.current) {
        api.loadFromElement(trustpilotRef.current, true)
      }
    }

    if (existing) {
      existing.addEventListener('load', loadWidget, { once: true })
      loadWidget()
      return () => existing.removeEventListener('load', loadWidget as any)
    }

    const s = document.createElement('script')
    s.src = scriptSrc
    s.async = true
    s.addEventListener('load', loadWidget, { once: true })
    document.head.appendChild(s)

    return () => {
      s.removeEventListener('load', loadWidget as any)
    }
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

        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Built to be there for the people you trust — without putting your data in ours.
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            ref={trustpilotRef}
            className="trustpilot-widget"
            data-locale="en-US"
            data-template-id="56278e9abfbbba0bdcd568bc"
            data-businessunit-id="697b3bf968c5676d5f35f9c4"
            data-style-height="52px"
            data-style-width="100%"
            data-token="f937daeb-1e1c-4c94-98ab-46cd1681acc6"
          >
            <a href="https://www.trustpilot.com/review/alwaysnest.co.uk" target="_blank" rel="noopener noreferrer">
              Trustpilot
            </a>
          </div>
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

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSupabaseSession } from '../hooks/useSupabaseSession'
import { capture } from '../analytics'

export function NewsletterPopup(props: { contactEmail?: string | null }) {
  const { session } = useSupabaseSession()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const openedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (session?.user?.id) return
    const dismissUntilRaw = window.localStorage.getItem('evernest_newsletter_dismissed_until')
    const dismissUntil = dismissUntilRaw ? Number(dismissUntilRaw) : 0
    const now = Date.now()
    if (dismissUntil && now < dismissUntil) return
    if (openedRef.current) return

    const openOnce = (reason: string) => {
      if (openedRef.current) return
      openedRef.current = true
      setIsOpen(true)
      capture('newsletter_popup_opened', { reason, page: window.location.pathname })
    }

    const timer = window.setTimeout(() => openOnce('delay'), 12000)
    const onMouseOut = (e: MouseEvent) => {
      const nearTop = typeof e.clientY === 'number' && e.clientY <= 0
      if (nearTop) openOnce('exit_intent')
    }
    document.addEventListener('mouseout', onMouseOut)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mouseout', onMouseOut)
    }
  }, [session?.user?.id])

  const dismissForDays = (days: number) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000
    window.localStorage.setItem('evernest_newsletter_dismissed_until', String(until))
  }

  const close = () => {
    setIsOpen(false)
    setError(null)
    setMessage(null)
    dismissForDays(7)
    capture('newsletter_popup_dismissed', { page: window.location.pathname })
  }

  const submit = async () => {
    setError(null)
    setMessage(null)
    const addr = email.trim().toLowerCase()
    const looksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)
    if (!looksValid) {
      setError('Enter a valid email')
      return
    }
    if (!supabase) {
      if (props.contactEmail) {
        setError(`Signup unavailable. Email us at ${props.contactEmail}.`)
      } else {
        setError('Signup unavailable right now.')
      }
      return
    }

    setIsSending(true)
    try {
      const { error } = await supabase.from('newsletter_signups').insert({
        email: addr,
        source: 'landing_popup',
        path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      })
      if (error) {
        if ((error as any).code === '23505') {
          setMessage('You’re already on the list. Thanks.')
          dismissForDays(365)
          capture('newsletter_signup_duplicate', { page: window.location.pathname })
          return
        }
        setError(error.message)
        return
      }

      setMessage('Thanks — we’ll email you product updates.')
      dismissForDays(365)
      capture('newsletter_signup', { page: window.location.pathname })
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" onMouseDown={() => close()}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 750, letterSpacing: -0.2 }}>Get product updates</div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
              No spam. Just major launches and security updates. Unsubscribe anytime.
            </div>
          </div>
          <button type="button" onClick={() => close()} style={{ padding: '8px 10px', boxShadow: 'none' }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            inputMode="email"
            autoComplete="email"
          />
          <button type="button" className="primary" onClick={() => void submit()} disabled={isSending}>
            {isSending ? 'Saving…' : 'Notify Me'}
          </button>
        </div>

        {error ? (
          <div className="error" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{message}</div>
          </div>
        ) : null}

        <div className="muted" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.55 }}>
          By subscribing, you agree to our <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms</Link>.
        </div>
      </div>
    </div>
  )
}


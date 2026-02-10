import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSupabaseSession } from '../hooks/useSupabaseSession'
import { capture } from '../analytics'

export function NewsletterPopup(props: { contactEmail?: string | null }) {
  const { session } = useSupabaseSession()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [weeklyOptIn, setWeeklyOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showGuideLink, setShowGuideLink] = useState(false)
  const [debugDetails, setDebugDetails] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [showTurnstile, setShowTurnstile] = useState(false)
  const openedRef = useRef(false)
  const sessionOpenedKey = 'evernest_newsletter_opened_session'
  const inputRef = useRef<HTMLInputElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<any>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = priorOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setShowTurnstile(false)
    setTurnstileToken('')
    setShowGuideLink(false)
    setDebugDetails(null)
    setWeeklyOptIn(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (!showTurnstile) return
    if (!siteKey) return
    if (!turnstileRef.current) return

    let canceled = false

    const render = () => {
      const api = (window as any).turnstile
      if (!api || canceled) return
      if (turnstileWidgetIdRef.current != null) {
        try {
          api.remove(turnstileWidgetIdRef.current)
        } catch {}
        turnstileWidgetIdRef.current = null
      }
      turnstileWidgetIdRef.current = api.render(turnstileRef.current, {
        sitekey: siteKey,
        size: 'compact',
        appearance: 'always',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      })
    }

    if ((window as any).turnstile) {
      render()
    } else {
      const existing = document.querySelector('script[data-turnstile="true"]') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', render, { once: true })
      } else {
        const s = document.createElement('script')
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        s.async = true
        s.defer = true
        s.dataset.turnstile = 'true'
        s.addEventListener('load', render, { once: true })
        document.head.appendChild(s)
      }
    }

    return () => {
      canceled = true
      const api = (window as any).turnstile
      if (api && turnstileWidgetIdRef.current != null) {
        try {
          api.remove(turnstileWidgetIdRef.current)
        } catch {}
      }
      turnstileWidgetIdRef.current = null
    }
  }, [isOpen, showTurnstile, siteKey])

  useEffect(() => {
    if (session?.user?.id) return
    const url = new URL(window.location.href)
    const forceOpen = url.searchParams.get('popup') === '1'
    const path = window.location.pathname
    const disableOnPaths = new Set(['/digital-estate-planning', '/pricing'])
    if (!forceOpen && disableOnPaths.has(path)) return
    const dismissUntilRaw = window.localStorage.getItem('evernest_newsletter_dismissed_until')
    const dismissUntil = dismissUntilRaw ? Number(dismissUntilRaw) : 0
    const now = Date.now()
    if (!forceOpen && dismissUntil && now < dismissUntil) return
    if (openedRef.current) return
    const openedThisSession = window.sessionStorage.getItem(sessionOpenedKey) === '1'
    if (!forceOpen && openedThisSession) return

    const openOnce = (reason: string) => {
      if (openedRef.current) return
      openedRef.current = true
      window.sessionStorage.setItem(sessionOpenedKey, '1')
      setIsOpen(true)
      capture('newsletter_popup_opened', { reason, page: window.location.pathname })
    }

    if (forceOpen) openOnce('force')

    const clicksToOpen = 6
    let clickCount = 0

    const onInteraction = () => {
      if (openedRef.current) return
      clickCount += 1
      if (clickCount >= clicksToOpen) openOnce(`click_${clicksToOpen}`)
    }

    const usePointer = typeof (window as any).PointerEvent === 'function'
    if (usePointer) {
      document.addEventListener('pointerdown', onInteraction, { passive: true })
    } else {
      document.addEventListener('click', onInteraction, { passive: true })
    }

    return () => {
      if (usePointer) {
        document.removeEventListener('pointerdown', onInteraction as any)
      } else {
        document.removeEventListener('click', onInteraction as any)
      }
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
    dismissForDays(1)
    capture('newsletter_popup_dismissed', { page: window.location.pathname })
  }

  const submit = async () => {
    setError(null)
    setMessage(null)
    const addr = email.trim().toLowerCase()
    const looksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)
    if (!looksValid) {
      setError('Enter a valid email address')
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
    if (!siteKey) {
      if (props.contactEmail) {
        setError(`Signup unavailable. Email us at ${props.contactEmail}.`)
      } else {
        setError('Signup unavailable right now.')
      }
      return
    }
    if (!turnstileToken) {
      setShowTurnstile(true)
      setError('Please complete the quick check below')
      return
    }

    setIsSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('newsletter-signup', {
        body: {
          email: addr,
          token: turnstileToken,
          source: 'lead_magnet_uk_guide',
          weekly_opt_in: weeklyOptIn === true,
          path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        },
      })
      if (error) {
        const msg = error.message || 'Failed to save signup'
        if (/404|not found/i.test(msg)) {
          if (props.contactEmail) setError(`Signup is being enabled. Email us at ${props.contactEmail}.`)
          else setError('Signup is being enabled. Try again shortly.')
        } else {
          setError(msg)
        }
        return
      }

      const duplicate = Boolean((data as any)?.duplicate)
      const emailSent = (data as any)?.email_sent === true
      const emailErrorStatus = (data as any)?.email_error_status
      const emailMissing = (data as any)?.email_missing
      const emailErrorBody = String((data as any)?.email_error_body ?? '')
      const emailErrorBodyLower = emailErrorBody.toLowerCase()
      const showDebug = new URL(window.location.href).searchParams.get('debug') === '1'

      if (emailSent) {
        setShowGuideLink(true)
        setMessage('Thanks — check your inbox (and spam) for the guide link. You can also open it below.')
      } else {
        setShowGuideLink(true)
        if (Array.isArray(emailMissing) && emailMissing.length) {
          setMessage('Thanks — email delivery is being enabled. You can open the guide below.')
        } else if (emailErrorBodyLower.includes('testing domain restriction') || emailErrorBodyLower.includes('resend.dev domain')) {
          setMessage('Thanks — email delivery needs a verified sending domain. You can open the guide below.')
        } else if (emailErrorStatus === 401 || emailErrorStatus === 403) {
          if (emailErrorBodyLower.includes('verified recipient') || emailErrorBodyLower.includes('verified recipients')) {
            setMessage('Thanks — email delivery is still in test mode. You can open the guide below.')
          } else if (emailErrorBodyLower.includes('verify') || emailErrorBodyLower.includes('verified') || emailErrorBodyLower.includes('domain') || emailErrorBodyLower.includes('sender')) {
            setMessage('Thanks — email delivery needs sender verification. You can open the guide below.')
          } else {
            setMessage('Thanks — we couldn’t email the link right now. You can open the guide below.')
          }
        } else {
          setMessage('Thanks — we couldn’t email the link right now. You can open the guide below.')
        }
        capture('newsletter_guide_email_send_failed', {
          page: window.location.pathname,
          status: typeof emailErrorStatus === 'number' ? emailErrorStatus : null,
          missing: Array.isArray(emailMissing) ? emailMissing.join(',') : null,
        })
        if (showDebug) {
          const statusText = typeof emailErrorStatus === 'number' ? String(emailErrorStatus) : 'unknown'
          const missingText = Array.isArray(emailMissing) && emailMissing.length ? `missing=${emailMissing.join(',')}` : ''
          const bodyText = emailErrorBody ? `body=${emailErrorBody}` : ''
          const joined = [statusText, missingText, bodyText].filter(Boolean).join(' | ')
          setDebugDetails(joined || 'No error details returned')
        }
      }
      dismissForDays(365)
      capture(duplicate ? 'newsletter_signup_duplicate' : 'newsletter_signup', { page: window.location.pathname })
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="newsletter_title" onClick={() => close()}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div id="newsletter_title" style={{ fontSize: 16, fontWeight: 750, letterSpacing: -0.2 }}>
              Free UK guide: Protect your important digital documents
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
              One email • No spam • UK-based
            </div>
          </div>
          <button type="button" onClick={() => close()} style={{ padding: '8px 10px', boxShadow: 'none' }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            placeholder="you@example.com"
            inputMode="email"
            autoComplete="email"
            aria-label="Your email address"
          />
          <button type="button" className="primary" onClick={() => void submit()} disabled={isSending}>
            {isSending ? 'Saving…' : 'Send me my guide'}
          </button>
        </div>

        <label className="muted" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.55 }}>
          <input
            type="checkbox"
            checked={weeklyOptIn}
            onChange={(e) => setWeeklyOptIn(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>Send me a short weekly reminder (optional).</span>
        </label>

        {siteKey && (showTurnstile || Boolean(turnstileToken)) ? (
          <div ref={turnstileRef} style={{ marginTop: 12, opacity: 0.88, transform: 'scale(0.94)', transformOrigin: '0 0' }} />
        ) : null}

        {error ? (
          <div className="error" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{message}</div>
            {showGuideLink ? (
              <div style={{ marginTop: 10 }}>
                <Link to="/uk-guide">Open the guide</Link>
              </div>
            ) : null}
            {debugDetails ? (
              <div className="muted" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word' }}>
                {debugDetails}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="muted" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.55 }}>
          By requesting the guide, you agree to our <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms</Link>.
        </div>
      </div>
    </div>
  )
}

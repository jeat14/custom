import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, supabaseMissingEnv } from '../supabaseClient'
import { useSupabaseSession } from '../hooks/useSupabaseSession'
import { capture } from '../analytics'

export function Login() {
  const navigate = useNavigate()
  const { session, isLoading } = useSupabaseSession()

  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && session) navigate('/vault', { replace: true })
  }, [isLoading, session, navigate])

  const sendMagicLink = async () => {
    setError(null)
    setMessage(null)
    const addr = email.trim()
    if (!addr) {
      setMessage('Enter your email to sign in.')
      return
    }

    const client = supabase
    if (!client) {
      setError(supabaseMissingEnv ?? 'Supabase not configured')
      return
    }

    setIsSending(true)
    try {
      const { error: authError } = await client.auth.signInWithOtp({
        email: addr,
        options: { emailRedirectTo: window.location.origin },
      })
      if (authError) {
        setError(authError.message)
        return
      }
      setMessage('Magic link sent. Check your email to finish signing in.')
      const domain = addr.includes('@') ? addr.split('@').slice(-1)[0] : undefined
      capture('magic_link_sent', domain ? { email_domain: domain } : undefined)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Sign In</h1>
        <div className="muted" style={{ marginTop: 8 }}>
          Use a magic link so you don’t need a password for the website. Your Vault Password is separate.
        </div>

        {supabaseMissingEnv ? (
          <div className="banner" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{supabaseMissingEnv}</div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="you@domain.com" />
          <button type="button" className="primary" onClick={() => void sendMagicLink()} disabled={isSending}>
            {isSending ? 'Sending…' : 'Send Magic Link'}
          </button>
        </div>

        {message ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{message}</div>
          </div>
        ) : null}
        {error ? (
          <div className="error" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}

        <div className="muted" style={{ marginTop: 14, fontSize: 13, display: 'flex', gap: 12 }}>
          <Link to="/security-audit">Security Audit</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/support">Support</Link>
        </div>
      </div>
    </div>
  )
}

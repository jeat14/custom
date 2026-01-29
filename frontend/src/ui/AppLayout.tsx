import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useVaultCheckInOncePerSession } from '../hooks/useVaultCheckInOncePerSession'
import { supabase } from '../supabaseClient'
import { useSupabaseSession } from '../hooks/useSupabaseSession'
import { FeedbackWidget } from './FeedbackWidget'
import { capture } from '../analytics'

export function AppLayout() {
  useVaultCheckInOncePerSession()
  const { session } = useSupabaseSession()
  const navigate = useNavigate()
  const location = useLocation()
  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail
  const showBack = location.pathname !== '/'
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    capture('$pageview', {
      path: location.pathname,
      search: location.search,
      user_id: session?.user?.id ?? null,
    })
  }, [location.pathname, location.search, session?.user?.id])

  useEffect(() => {
    const client = supabase
    if (!client || !session?.user?.id) {
      setIsAdmin(false)
      return
    }

    let canceled = false
    void (async () => {
      try {
        const { data, error } = await client.rpc('is_admin')
        if (canceled) return
        if (error) {
          setIsAdmin(false)
          return
        }
        setIsAdmin(Boolean(data))
      } catch {
        if (!canceled) setIsAdmin(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [session?.user?.id])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 16 }}>
        <div
          className="card"
          style={{
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showBack ? (
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) navigate(-1)
                  else navigate('/')
                }}
                style={{ padding: '8px 10px', boxShadow: 'none' }}
              >
                Back
              </button>
            ) : null}
            <Link to="/" style={{ textDecoration: 'none' }}>
              <div style={{ fontWeight: 750, letterSpacing: -0.2 }}>Evernest</div>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {session?.user?.email ? (
              <>
                <span className="pill" style={{ fontSize: 12 }}>
                  {session.user.email}
                </span>
                {isAdmin ? (
                  <Link to="/admin/system-health" style={{ textDecoration: 'none' }}>
                    <button type="button" style={{ padding: '8px 10px', boxShadow: 'none' }}>
                      Admin
                    </button>
                  </Link>
                ) : null}
                <button type="button" onClick={() => void supabase?.auth.signOut()}>
                  Sign Out
                </button>
              </>
            ) : (
              <button type="button" className="primary" onClick={() => navigate('/login')}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          color: 'var(--muted)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>Evernest</div>
          {contactEmail ? (
            <a href={`mailto:${contactEmail}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              {contactEmail}
            </a>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/security">Security Audit</Link>
          <Link to="/heir">Heir Handover</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/support">Support</Link>
          <FeedbackWidget userId={session?.user?.id ?? null} />
        </div>
      </footer>
    </div>
  )
}

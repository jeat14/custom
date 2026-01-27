import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
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

  useEffect(() => {
    capture('$pageview', {
      path: location.pathname,
      search: location.search,
      user_id: session?.user?.id ?? null,
    })
  }, [location.pathname, location.search, session?.user?.id])

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
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 750, letterSpacing: -0.2 }}>Evernest</div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {session?.user?.email ? (
              <>
                <span className="pill" style={{ fontSize: 12 }}>
                  {session.user.email}
                </span>
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
        <div>Evernest</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/security-audit">Security Audit</Link>
          <Link to="/heir">Heir Handover</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/support">Support</Link>
          <FeedbackWidget userId={session?.user?.id ?? null} />
        </div>
      </footer>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export function RequireAdmin(props: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setIsAuthed(false)
      setIsAdmin(false)
      setIsChecking(false)
      return
    }

    let isCancelled = false

    const sync = async () => {
      setError(null)
      const { data } = await client.auth.getSession()
      if (isCancelled) return
      const session = data.session
      setIsAuthed(!!session)
      if (!session) {
        setIsAdmin(false)
        setIsChecking(false)
        return
      }

      const { data: adminData, error: adminError } = await client.rpc('is_admin')
      if (isCancelled) return
      if (adminError) {
        setError(adminError.message)
        setIsAdmin(false)
        setIsChecking(false)
        return
      }
      setIsAdmin(!!adminData)
      setIsChecking(false)
    }

    void sync()

    const { data } = client.auth.onAuthStateChange(() => {
      void sync()
    })

    return () => {
      isCancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  if (isChecking) return <div style={{ padding: 24 }}>Loading…</div>
  if (!isAuthed) return <Navigate to="/login" replace />
  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        <div className="card" style={{ padding: 18 }}>
          <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Admin Access Required</h1>
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{error}</div>
          </div>
          <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            <Link to="/vault">Return to Vault</Link>
          </div>
        </div>
      </div>
    )
  }
  if (!isAdmin) {
    return (
      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        <div className="card" style={{ padding: 18 }}>
          <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Admin Access Required</h1>
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>
              Your account is signed in, but not allowlisted as an admin.
            </div>
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              Insert your Supabase Auth UID into public.app_admins to enable admin controls.
            </div>
          </div>
          <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            <Link to="/vault">Return to Vault</Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{props.children}</>
}


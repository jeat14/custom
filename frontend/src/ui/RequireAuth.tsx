import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export function RequireAuth(props: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setIsAuthed(false)
      setIsChecking(false)
      return
    }

    let isCancelled = false

    const sync = async () => {
      const { data } = await client.auth.getSession()
      if (isCancelled) return
      setIsAuthed(!!data.session)
      setIsChecking(false)
    }

    void sync()

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session)
      setIsChecking(false)
    })

    return () => {
      isCancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  if (isChecking) return <div style={{ padding: 24 }}>Loading…</div>
  if (!isAuthed) return <Navigate to="/login" replace />
  return <>{props.children}</>
}


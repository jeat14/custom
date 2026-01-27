import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const client = supabase
    if (!client) return

    let isCancelled = false

    const sync = async () => {
      const { data } = await client.auth.getSession()
      if (isCancelled) return
      setSession(data.session ?? null)
      setIsLoading(false)
    }

    void sync()

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      isCancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  return { session, isLoading }
}


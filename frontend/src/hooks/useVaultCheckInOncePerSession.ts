import { useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useVaultCheckInOncePerSession() {
  useEffect(() => {
    const client = supabase
    if (!client) return

    let isCancelled = false

    const run = async () => {
      const { data } = await client.auth.getSession()
      const session = data.session

      if (isCancelled || !session) return

      const key = `vault_checkin_done:${session.user.id}`
      if (sessionStorage.getItem(key)) return

      sessionStorage.setItem(key, '1')
      await client.rpc('check_in')
    }

    void run()

    const { data } = client.auth.onAuthStateChange((_event: unknown, session: any) => {
      if (!session) return
      void run()
    })

    return () => {
      isCancelled = true
      data.subscription.unsubscribe()
    }
  }, [])
}

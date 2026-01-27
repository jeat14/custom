import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseMissingEnv } from '../supabaseClient'

type SystemHealth = {
  cron_available: boolean
  job?: {
    jobname: string
    schedule: string
    active: boolean
  } | null
  last_run?: {
    status: string | null
    start_time: string | null
    end_time: string | null
    return_message: string | null
  } | null
  counts_7d?: {
    success: number
    failed: number
  } | null
}

export function AdminSystemHealth() {
  if (supabaseMissingEnv) return <div style={{ padding: 24 }}>{supabaseMissingEnv}</div>

  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    const run = async () => {
      setIsLoading(true)
      setError(null)

      const client = supabase!
      const { data: sessionData } = await client.auth.getSession()
      if (!sessionData.session) {
        setIsLoading(false)
        setError('Not signed in')
        return
      }

      const { data, error: rpcError } = await client.rpc('admin_system_health')
      if (isCancelled) return

      if (rpcError) {
        const msg = rpcError.message ?? 'Failed to load system health'
        if (/function public\.admin_system_health\(\) does not exist|admin_system_health/i.test(msg)) {
          setError('System health function not installed')
        } else {
          setError(msg)
        }
        setHealth(null)
        setIsLoading(false)
        return
      }

      setHealth((data ?? null) as SystemHealth | null)
      setIsLoading(false)
    }

    void run()

    return () => {
      isCancelled = true
    }
  }, [])

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, letterSpacing: -0.3 }}>System Health</h1>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Monitor the daily cron job that evaluates deadman switches.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/pending-verifications">Pending Verifications</Link>
            <span className="pill" style={{ fontSize: 12 }}>
              Health
            </span>
          </div>
        </div>

        {error ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{error}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              {error === 'System health function not installed'
                ? 'Run supabase/admin_system_health.sql in your Supabase SQL editor, then refresh.'
                : 'If you are an admin, ensure your UID is inserted into public.app_admins.'}
            </div>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="statusBar">
            <div className="statusLeft">
              <span className={['statusDot', health?.cron_available ? 'ok' : 'warn'].join(' ')} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>
                  {health?.cron_available ? 'Cron Available' : 'Cron Not Available'}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {health?.cron_available
                    ? 'Reading pg_cron run history'
                    : 'Enable pg_cron + pg_net in your Supabase project'}
                </div>
              </div>
            </div>
            <div className="pill" style={{ fontSize: 12 }}>
              daily_evaluate_deadman_switches
            </div>
          </div>

          <div className="statusBar">
            <div className="statusLeft">
              <span
                className={[
                  'statusDot',
                  health?.last_run?.status?.toLowerCase() === 'succeeded' ? 'ok' : 'warn',
                ].join(' ')}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>Last Run</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {health?.last_run?.start_time ? new Date(health.last_run.start_time).toLocaleString() : '—'}
                </div>
              </div>
            </div>
            <div className="pill" style={{ fontSize: 12 }}>
              {health?.last_run?.status ?? 'unknown'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="pill" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Success (7d)
            </span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{health?.counts_7d?.success ?? 0}</span>
          </div>
          <div className="pill" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Failed (7d)
            </span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{health?.counts_7d?.failed ?? 0}</span>
          </div>
          <div className="pill" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Schedule
            </span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{health?.job?.schedule ?? '—'}</span>
          </div>
        </div>

        {health?.last_run?.return_message ? (
          <div className="banner" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>Last Message</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {health.last_run.return_message}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseMissingEnv } from '../supabaseClient'

type NewsletterSignup = {
  email: string
  created_at: string
  source: string | null
  path: string | null
  referrer: string | null
}

function csvEscape(value: unknown) {
  const s = value == null ? '' : String(value)
  const needsQuotes = /[",\n\r]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export function AdminNewsletter() {
  if (supabaseMissingEnv) return <div style={{ padding: 24 }}>{supabaseMissingEnv}</div>

  const [rows, setRows] = useState<NewsletterSignup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  const csv = useMemo(() => {
    const header = ['email', 'created_at', 'source', 'path', 'referrer']
    const lines = [header.join(',')]
    for (const r of rows) {
      lines.push([r.email, r.created_at, r.source, r.path, r.referrer].map(csvEscape).join(','))
    }
    return lines.join('\n')
  }, [rows])

  const downloadUrl = useMemo(() => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    return URL.createObjectURL(blob)
  }, [csv])

  useEffect(() => {
    return () => URL.revokeObjectURL(downloadUrl)
  }, [downloadUrl])

  const refresh = async () => {
    setIsLoading(true)
    setError(null)
    const client = supabase!
    const { data, error } = await client
      .from('newsletter_signups')
      .select('email, created_at, source, path, referrer')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      setError(error.message)
      setRows([])
      setIsLoading(false)
      return
    }
    setRows((data ?? []) as NewsletterSignup[])
    setIsLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Newsletter</h1>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Recent signups (latest 500). Use CSV export for outreach.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/admin/pending-verifications">Pending Verifications</Link>
            <Link to="/admin/system-health">System Health</Link>
            <span className="pill" style={{ fontSize: 12 }}>
              Newsletter
            </span>
            <button type="button" onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{error}</div>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="pill" style={{ fontSize: 12 }}>
            {rows.length} signups
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(csv)
                setToast('Copied CSV')
              }}
              disabled={!rows.length}
            >
              Copy CSV
            </button>
            <a href={downloadUrl} download="evernest-newsletter-signups.csv" style={{ textDecoration: 'none' }}>
              <button type="button" disabled={!rows.length}>
                Download CSV
              </button>
            </a>
          </div>
        </div>

        <div style={{ marginTop: 14, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 780 }}>
            <thead>
              <tr>
                {['Email', 'Created', 'Source', 'Path', 'Referrer'].map((c) => (
                  <th
                    key={c}
                    style={{
                      textAlign: 'left',
                      padding: 10,
                      fontSize: 12,
                      color: 'var(--muted)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.email}-${r.created_at}`}>
                  <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>{r.email}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>{r.source ?? '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>{r.path ?? '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>{r.referrer ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast ? (
        <div className="toastWrap">
          <div className="toast">
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{toast}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


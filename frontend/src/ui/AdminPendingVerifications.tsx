import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseMissingEnv } from '../supabaseClient'

type Row = {
  request_id: string
  vault_id: string
  owner_id: string
  owner_email: string
  heir_user_id: string
  heir_email: string
  status: string
  proof_of_death_path: string
  created_at: string
}

export function AdminPendingVerifications() {
  if (supabaseMissingEnv) return <div style={{ padding: 24 }}>{supabaseMissingEnv}</div>

  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rejectingRow, setRejectingRow] = useState<Row | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const columns = useMemo(
    () => [
      'Vault Owner',
      'Heir',
      'Status',
      'Documents',
      'Quick Actions',
      'Created',
    ],
    []
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const client = supabase!
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) {
      setIsLoading(false)
      setError('Not signed in')
      return
    }

    const { data, error: rpcError } = await client.rpc('admin_pending_verifications')

    if (rpcError) {
      setError(rpcError.message)
      setRows([])
      setIsLoading(false)
      return
    }

    setRows((data ?? []) as Row[])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  const openProof = async (path: string) => {
    const client = supabase!
    const { data, error: storageError } = await client.storage
      .from('proof-of-death')
      .createSignedUrl(path, 60 * 10)

    if (storageError) {
      setError(storageError.message)
      return
    }

    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const handleApprove = async (row: Row) => {
    setIsSubmitting(true)
    setError(null)
    const client = supabase!
    const { error: rpcError } = await client.rpc('admin_approve_verification_request', {
      request_id: row.request_id,
    })
    setIsSubmitting(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setRejectingRow(null)
    setRejectReason('')
    setToast('Approved & recorded')
    await refresh()
  }

  const openReject = (row: Row) => {
    setRejectingRow(row)
    setRejectReason('')
    setError(null)
  }

  const submitReject = async () => {
    if (!rejectingRow) return
    if (!rejectReason.trim()) {
      setError('Please enter a rejection reason')
      return
    }

    setIsSubmitting(true)
    setError(null)
    const client = supabase!
    const { error: rpcError } = await client.rpc('admin_reject_verification_request', {
      request_id: rejectingRow.request_id,
      reason: rejectReason.trim(),
    })
    setIsSubmitting(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    const { error: fnError } = await client.functions.invoke('admin-verification-email', {
      body: { request_id: rejectingRow.request_id, reason: rejectReason.trim() },
    })
    if (fnError) {
      setError(`Rejected, but failed to email heir: ${fnError.message}`)
      setToast('Rejected')
    } else {
      setToast('Rejected & emailed')
    }

    setRejectingRow(null)
    setRejectReason('')
    await refresh()
  }

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, letterSpacing: -0.3 }}>Pending Verifications</h1>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Review proof documents before allowing heir access.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="pill" style={{ fontSize: 12 }}>
              Pending Verifications
            </span>
            <Link to="/admin/system-health">System Health</Link>
            <button type="button" onClick={() => void refresh()} disabled={isSubmitting}>
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

      {rejectingRow ? (
        <div
          role="dialog"
          aria-modal="true"
          className="modalOverlay"
          onMouseDown={() => {
            if (isSubmitting) return
            setRejectingRow(null)
            setRejectReason('')
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Reject Verification</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 10 }}>
              {rejectingRow.heir_email} • {rejectingRow.owner_email}
            </div>
            <textarea
              value={rejectReason}
              onChange={(e: any) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Reason (e.g., Document blurry, need official death certificate)"
            />
            <div className="modalActions">
              <button
                type="button"
                onClick={() => {
                  setRejectingRow(null)
                  setRejectReason('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="button" className="primary" onClick={() => void submitReject()} disabled={isSubmitting}>
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="card" style={{ padding: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {columns.map((c) => (
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
              <tr key={r.request_id}>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>{r.owner_email}</td>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>{r.heir_email}</td>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>
                  <span className="pill" style={{ fontSize: 12 }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>
                  <button type="button" onClick={() => void openProof(r.proof_of_death_path)} disabled={isSubmitting}>
                    View Proof of Death
                  </button>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="primary" onClick={() => void handleApprove(r)} disabled={isSubmitting}>
                      Approve
                    </button>
                    <button type="button" onClick={() => openReject(r)} disabled={isSubmitting}>
                      Reject
                    </button>
                  </div>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)', color: 'var(--muted)' }}>
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={{ padding: 12 }} colSpan={columns.length}>
                  <span className="muted">No pending verifications</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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

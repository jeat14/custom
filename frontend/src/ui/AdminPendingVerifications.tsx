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
  supporting_document_path: string | null
  created_at: string
}

type HistoryRow = {
  event_type: string
  note: string | null
  actor_id: string | null
  actor_email: string | null
  created_at: string
}

export function AdminPendingVerifications() {
  if (supabaseMissingEnv) return <div style={{ padding: 24 }}>{supabaseMissingEnv}</div>

  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rejectingRow, setRejectingRow] = useState<Row | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvingRow, setApprovingRow] = useState<Row | null>(null)
  const [approveNote, setApproveNote] = useState('')
  const [viewerRow, setViewerRow] = useState<Row | null>(null)
  const [viewerDeathUrl, setViewerDeathUrl] = useState<string | null>(null)
  const [viewerSupportingUrl, setViewerSupportingUrl] = useState<string | null>(null)
  const [viewerError, setViewerError] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [viewerHistory, setViewerHistory] = useState<HistoryRow[]>([])
  const [viewerHistoryLoading, setViewerHistoryLoading] = useState(false)
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

  const openViewer = async (row: Row) => {
    setViewerRow(row)
    setViewerDeathUrl(null)
    setViewerSupportingUrl(null)
    setViewerError(null)
    setViewerLoading(true)
    setViewerHistory([])
    setViewerHistoryLoading(true)
    try {
      const client = supabase!
      const { data: death, error: deathErr } = await client.storage
        .from('proof-of-death')
        .createSignedUrl(row.proof_of_death_path, 60 * 10)
      if (deathErr) throw deathErr

      let supportingUrl: string | null = null
      if (row.supporting_document_path) {
        const { data: sup, error: supErr } = await client.storage
          .from('proof-of-death')
          .createSignedUrl(row.supporting_document_path, 60 * 10)
        if (supErr) throw supErr
        supportingUrl = sup?.signedUrl ?? null
      }

      setViewerDeathUrl(death?.signedUrl ?? null)
      setViewerSupportingUrl(supportingUrl)

      await client.rpc('admin_log_verification_event', {
        request_id: row.request_id,
        event_type: 'documents_viewed',
        note: '',
        metadata: {
          has_supporting_document: !!row.supporting_document_path,
        },
      } as any)

      const { data: historyRows, error: histErr } = await client.rpc('admin_verification_history', {
        request_id: row.request_id,
      })
      if (histErr) throw histErr
      setViewerHistory((historyRows ?? []) as any)
    } catch (e: any) {
      setViewerError(e?.message ?? 'Failed to load documents')
    } finally {
      setViewerLoading(false)
      setViewerHistoryLoading(false)
    }
  }

  const openApprove = (row: Row) => {
    setApprovingRow(row)
    setApproveNote('')
    setError(null)
  }

  const submitApprove = async () => {
    if (!approvingRow) return
    setIsSubmitting(true)
    setError(null)
    const client = supabase!
    const { error: rpcError } = await client.rpc('admin_approve_verification_request', {
      request_id: approvingRow.request_id,
      reason: approveNote.trim(),
    })
    setIsSubmitting(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setRejectingRow(null)
    setRejectReason('')
    setApprovingRow(null)
    setApproveNote('')
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

    const { data: sessionData } = await client.auth.getSession()
    const accessToken = sessionData.session?.access_token
    const { error: fnError } = await client.functions.invoke('admin-verification-email', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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
            <Link to="/support">Support</Link>
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
      {approvingRow ? (
        <div
          role="dialog"
          aria-modal="true"
          className="modalOverlay"
          onMouseDown={() => {
            if (isSubmitting) return
            setApprovingRow(null)
            setApproveNote('')
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Approve Verification</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 10 }}>
              {approvingRow.heir_email} • {approvingRow.owner_email}
            </div>
            <textarea
              value={approveNote}
              onChange={(e: any) => setApproveNote(e.target.value)}
              rows={3}
              placeholder="Approval note (optional, e.g., Death certificate is clear and matches owner details)"
            />
            <div className="modalActions">
              <button
                type="button"
                onClick={() => {
                  setApprovingRow(null)
                  setApproveNote('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="button" className="primary" onClick={() => void submitApprove()} disabled={isSubmitting}>
                Approve
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {viewerRow ? (
        <div
          role="dialog"
          aria-modal="true"
          className="modalOverlay"
          onMouseDown={() => {
            if (viewerLoading) return
            setViewerRow(null)
            setViewerDeathUrl(null)
            setViewerSupportingUrl(null)
            setViewerError(null)
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 1200, width: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Documents</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  {viewerRow.heir_email} • {viewerRow.owner_email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewerRow(null)
                  setViewerDeathUrl(null)
                  setViewerSupportingUrl(null)
                  setViewerError(null)
                }}
                disabled={viewerLoading}
              >
                Close
              </button>
            </div>

            {viewerError ? (
              <div className="error" style={{ marginTop: 12 }}>
                {viewerError}
              </div>
            ) : null}

            {viewerLoading ? (
              <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                Loading documents…
              </div>
            ) : (
              <>
                <div className="docSideBySide" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div
                      style={{
                        padding: 10,
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Death Certificate</div>
                      <button
                        type="button"
                        onClick={() => void openProof(viewerRow.proof_of_death_path)}
                        style={{ padding: '6px 10px' }}
                      >
                        Open
                      </button>
                    </div>
                    {viewerDeathUrl ? (
                      <iframe title="Death certificate" src={viewerDeathUrl} style={{ width: '100%', height: 560, border: 0 }} />
                    ) : (
                      <div className="muted" style={{ padding: 12, fontSize: 13 }}>
                        No document
                      </div>
                    )}
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div
                      style={{
                        padding: 10,
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Supporting Doc</div>
                      {viewerRow.supporting_document_path ? (
                        <button
                          type="button"
                          onClick={() => void openProof(viewerRow.supporting_document_path!)}
                          style={{ padding: '6px 10px' }}
                        >
                          Open
                        </button>
                      ) : (
                        <div className="muted" style={{ fontSize: 12, padding: '6px 10px' }}>
                          None
                        </div>
                      )}
                    </div>
                    {viewerSupportingUrl ? (
                      <iframe
                        title="Supporting document"
                        src={viewerSupportingUrl}
                        style={{ width: '100%', height: 560, border: 0 }}
                      />
                    ) : (
                      <div className="muted" style={{ padding: 12, fontSize: 13 }}>
                        No document
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>History</div>
                  {viewerHistoryLoading ? (
                    <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                      Loading history…
                    </div>
                  ) : viewerHistory.length ? (
                    <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      {viewerHistory.map((h) => (
                        <div key={`${h.created_at}-${h.event_type}`} className="banner" style={{ padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{h.event_type}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {new Date(h.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                            {(h.actor_email ?? 'Unknown admin') + (h.note ? ` — ${h.note}` : '')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                      No history yet.
                    </div>
                  )}
                </div>
              </>
            )}
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
                  {Date.now() - new Date(r.created_at).getTime() > 48 * 60 * 60 * 1000 ? (
                    <span className="pill" style={{ fontSize: 12, marginLeft: 8 }}>
                      48h+
                    </span>
                  ) : null}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => void openViewer(r)} disabled={isSubmitting}>
                      View side-by-side
                    </button>
                  </div>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid rgba(31,41,55,0.08)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="primary" onClick={() => openApprove(r)} disabled={isSubmitting}>
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

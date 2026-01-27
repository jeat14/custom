import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { capture } from '../analytics'

export function FeedbackWidget(props: { userId?: string | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const submit = async () => {
    setError(null)
    const text = message.trim()
    if (!text) {
      setError('Enter feedback before sending')
      return
    }
    if (!props.userId) {
      setError('Sign in required')
      return
    }
    if (!supabase) {
      setError('Supabase not configured')
      return
    }

    setIsSending(true)
    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: props.userId,
        page: window.location.pathname,
        message: text,
      })
      if (error) {
        setError(error.message)
        return
      }
      capture('feedback_sent', { distinct_id: props.userId, page: window.location.pathname })
      setMessage('')
      setIsOpen(false)
      setToast('Thanks for the feedback')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Feedback
      </button>

      {isOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" onMouseDown={() => setIsOpen(false)}>
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Feedback</div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
              Tell me what felt confusing, what felt safe, and what you wish was simpler.
            </div>
            <textarea
              value={message}
              onChange={(e: any) => setMessage(e.target.value)}
              rows={5}
              placeholder="Type your feedback…"
              style={{ marginTop: 12 }}
            />
            {error ? (
              <div className="error" style={{ marginTop: 10 }}>
                {error}
              </div>
            ) : null}
            <div className="modalActions">
              <button type="button" onClick={() => setIsOpen(false)} disabled={isSending}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={() => void submit()} disabled={isSending}>
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toastWrap">
          <div className="toast">
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{toast}</div>
          </div>
        </div>
      ) : null}
    </>
  )
}


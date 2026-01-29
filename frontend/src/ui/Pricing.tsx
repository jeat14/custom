import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase, supabaseMissingEnv } from '../supabaseClient'
import { useSupabaseSession } from '../hooks/useSupabaseSession'
import { capture } from '../analytics'

type BillingPlan = 'free' | 'pro' | 'unknown'

export function Pricing() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, isLoading: isSessionLoading } = useSupabaseSession()

  const rawContactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const contactEmail = rawContactEmail?.match(/<([^>]+)>/)?.[1] ?? rawContactEmail

  const [billingPlan, setBillingPlan] = useState<BillingPlan>('unknown')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [demoStep, setDemoStep] = useState(0)

  const checkoutStatus = useMemo(() => {
    const s = new URLSearchParams(location.search).get('checkout')
    if (s === 'success' || s === 'cancel') return s
    return null
  }, [location.search])

  useEffect(() => {
    capture('pricing_viewed')
  }, [])

  useEffect(() => {
    if (!checkoutStatus) return
    if (checkoutStatus === 'success') setNotice('Upgrade complete. Welcome to Pro.')
    if (checkoutStatus === 'cancel') setNotice('Checkout canceled.')
  }, [checkoutStatus])

  useEffect(() => {
    let isCancelled = false
    const run = async () => {
      if (supabaseMissingEnv) return
      setBillingPlan('unknown')
      setError(null)

      const client = supabase!
      const { data: sessionData } = await client.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) {
        setBillingPlan('free')
        return
      }

      const { data, error: planErr } = await client
        .from('user_billing')
        .select('plan')
        .eq('user_id', userId)
        .maybeSingle()

      if (isCancelled) return

      if (planErr) {
        setError(planErr.message)
        setBillingPlan('unknown')
        return
      }

      const plan = (data as any)?.plan
      setBillingPlan(plan === 'pro' ? 'pro' : 'free')
    }
    void run()
    return () => {
      isCancelled = true
    }
  }, [session?.user?.id])

  const startCheckout = async () => {
    setError(null)
    setNotice(null)

    if (supabaseMissingEnv || !supabase) {
      setError(supabaseMissingEnv ?? 'Supabase not configured')
      return
    }

    if (!session?.user) {
      navigate('/login')
      return
    }

    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
      return
    }

    setIsBusy(true)
    capture('checkout_started', { distinct_id: session.user.id, source: 'pricing' })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setNotice('Sign in required')
        return
      }

      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'x-user-jwt': sessionData.session.access_token,
        },
        body: JSON.stringify({
          success_url: `${window.location.origin}/pricing?checkout=success`,
          cancel_url: `${window.location.origin}/pricing?checkout=cancel`,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setError(text ? `Checkout failed (${res.status}): ${text}` : `Checkout failed (${res.status})`)
        return
      }

      const data = (await res.json().catch(() => null)) as null | { url?: string }
      const url = data?.url
      if (!url) {
        setError('Missing checkout url')
        return
      }
      window.location.assign(url)
    } finally {
      setIsBusy(false)
    }
  }

  const openBillingPortal = async () => {
    setError(null)
    setNotice(null)

    if (supabaseMissingEnv || !supabase) {
      setError(supabaseMissingEnv ?? 'Supabase not configured')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      setNotice('Sign in required')
      navigate('/login')
      return
    }

    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
      return
    }

    setIsBusy(true)
    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'x-user-jwt': sessionData.session.access_token,
        },
        body: JSON.stringify({ return_url: `${window.location.origin}/pricing` }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setError(text ? `Portal failed (${res.status}): ${text}` : `Portal failed (${res.status})`)
        return
      }

      const data = (await res.json().catch(() => null)) as null | { url?: string }
      const url = data?.url
      if (!url) {
        setError('Missing portal url')
        return
      }
      window.location.assign(url)
    } finally {
      setIsBusy(false)
    }
  }

  const priceText = '£7.99 / month'

  const tooltipStyle: Record<string, any> = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderRadius: 999,
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    fontSize: 11,
    lineHeight: 1,
    marginLeft: 6,
    cursor: 'help',
    userSelect: 'none',
  }

  const priorityHandlingTooltip =
    'Faster review if a handover request is submitted. Pro requests are reviewed within 4 business hours. Free still works; Pro only affects response speed and support.'

  type FeatureRow = { feature: string; free: ReactNode; pro: ReactNode }

  const featureRows: FeatureRow[] = [
    { feature: 'Secure Storage', free: 'Included', pro: 'Included' },
    { feature: 'End‑to‑End Encryption', free: 'Included', pro: 'Included' },
    {
      feature: 'Heir Handover',
      free: 'Included',
      pro: (
        <strong>
          Included + faster review
          <span role="img" aria-label="What does priority handling mean?" title={priorityHandlingTooltip} style={tooltipStyle}>
            i
          </span>
        </strong>
      ),
    },
    { feature: 'Support', free: 'Community / standard', pro: <strong>Priority support</strong> },
    { feature: 'Monthly Price', free: '£0', pro: '£7.99' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, letterSpacing: -0.4 }}>Pricing</h1>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Secure your digital legacy today with faster heir handover review and priority support.
            </div>
          </div>
          <div className="pill" style={{ fontSize: 12 }}>
            {billingPlan === 'pro' ? 'Pro' : billingPlan === 'free' ? 'Free' : isSessionLoading ? 'Loading…' : 'Plan'}
          </div>
        </div>

        {notice ? (
          <div className="banner" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{notice}</div>
          </div>
        ) : null}
        {error ? (
          <div className="error" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Free</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, fontSize: 13 }}>
              Try Evernest and build your first vault.
            </div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, fontSize: 12 }}>
              Best for getting started and long‑term storage.
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div>✓ Secure vault storage</div>
              <div>✓ End‑to‑end encryption in your browser</div>
              <div>✓ Heir handover flow</div>
              <div className="muted">— Standard support</div>
            </div>
          </div>

          <div className="card" style={{ padding: 16, border: '1px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Evernest Pro</div>
              <div className="pill" style={{ fontSize: 12 }}>
                Best value
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>{priceText}</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, fontSize: 13 }}>
              For people who want added peace of mind and faster support.
            </div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, fontSize: 12 }}>
              Best for active monitoring and reassurance.
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div>✓ Everything in Free</div>
              <div>✓ Priority support</div>
              <div>
                ✓ Faster review if a handover request is submitted
                <span role="img" aria-label="What does priority handling mean?" title={priorityHandlingTooltip} style={tooltipStyle}>
                  i
                </span>
              </div>
              <div>✓ Helps fund independent audits and ongoing security hardening</div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {billingPlan === 'pro' ? (
                <button type="button" className="primary" onClick={() => void openBillingPortal()} disabled={isBusy}>
                  {isBusy ? 'Opening…' : 'Manage Billing'}
                </button>
              ) : (
                <button type="button" className="primary" onClick={() => void startCheckout()} disabled={isBusy}>
                  {isBusy ? 'Opening…' : session ? 'Unlock Pro Features' : 'Sign in to upgrade'}
                </button>
              )}
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6 }}>
              Secure checkout by Stripe. Cancel anytime with one click.
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>
              All vaults are treated with the same care. Pro only affects response speed and support.
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>
              Prefer annual? £79/year (2 months free){contactEmail ? (
                <>
                  {' '}
                  — <a href={`mailto:${contactEmail}`} style={{ color: 'inherit' }}>email us</a>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, letterSpacing: -0.2 }}>Free vs Pro</h2>
            <Link to="/security-audit" style={{ textDecoration: 'none' }}>
              <span className="pill" style={{ fontSize: 12 }}>
                Read our security self‑audit
              </span>
            </Link>
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
            Simple comparison to make the decision easy.
          </div>

          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>Feature</th>
                  <th style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>Free</th>
                  <th style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>Evernest Pro</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((r) => (
                  <tr key={r.feature}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 650 }}>{r.feature}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      {r.free}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{r.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
            Trusted by early adopters securing their digital estates with Evernest.
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: -0.2 }}>Heir Handover Preview</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
            See the flow in seconds: secure today, protected tomorrow.
          </div>

          <div className="card" style={{ padding: 14, marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { title: '1) Create Vault', text: 'Add your critical accounts and recovery notes.' },
                  { title: '2) Set Heir', text: 'Choose an heir and configure your handover.' },
                  { title: '3) Verified Release', text: 'Requests are reviewed, then the heir receives access.' },
                ].map((s, idx) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => setDemoStep(idx)}
                    style={{
                      padding: '8px 10px',
                      border: idx === demoStep ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: idx === demoStep ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 650,
                      cursor: 'pointer',
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setDemoStep((n) => (n + 1) % 3)} style={{ padding: '8px 10px', borderRadius: 12 }}>
                Next
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {demoStep === 0 ? (
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  Build your nest with the accounts, PINs, and recovery details your loved ones would otherwise struggle to find.
                </div>
              ) : demoStep === 1 ? (
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  Assign an heir and keep your vault protected behind verification. Your encrypted vault stays private.
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  If an heir requests access, the verification step prevents abuse. Pro includes priority handling of reviews.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: -0.2 }}>FAQ</h2>
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            <details className="card" style={{ padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Can I cancel anytime?</summary>
              <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                Yes. You can manage or cancel your subscription from the Billing Portal.
              </div>
            </details>
            <details className="card" style={{ padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 650 }}>What happens to my data if I stop paying?</summary>
              <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                Your vault remains encrypted client‑side. If you cancel, your plan returns to Free and you keep access.
              </div>
            </details>
            <details className="card" style={{ padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Is Evernest able to read my vault?</summary>
              <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                No. Vault contents are end‑to‑end encrypted in your browser. Evernest cannot reset your Vault Password.
              </div>
            </details>
            <details className="card" style={{ padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Do you offer invoices or business plans?</summary>
              <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                Not yet. If you need invoicing or a team plan, contact us and we’ll help.
              </div>
            </details>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/support">Support</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseMissingEnv } from '../supabaseClient'
import { capture } from '../analytics'
import {
  b64ToBytes,
  bytesToB64,
  decryptVaultJson,
  deriveMasterKey,
  encryptVaultJson,
  importDekKey,
  newDekBytes,
  newKdfParams,
  unwrapDek,
  wrapDek,
} from '../crypto/zk'
import { generateRecoveryPdf } from '../recoveryPdf'

type CategoryKey = 'financials' | 'business_ip' | 'sentimental' | 'admin'

type AssetItem = {
  id: string
  label: string
  value: string
  kind?: 'secret' | 'note'
}

type VaultPayloadV1 = {
  v: 1
  categories: Record<CategoryKey, AssetItem[]>
}

type VaultRow = {
  id: string
  kdf_params: any
  vault_ciphertext: any
  owner_wrapped_dek: any
}

function newId() {
  return crypto.getRandomValues(new Uint32Array(4)).join('-')
}

function computeStrengthPct(payload: VaultPayloadV1) {
  const allItems = Object.values(payload.categories).flat()
  const total = allItems.length
  const filled = allItems.filter((i) => (i.value ?? '').trim().length > 0).length
  return total ? Math.min(100, Math.round((filled / total) * 100)) : 0
}

function templatePayload(): VaultPayloadV1 {
  return {
    v: 1,
    categories: {
      financials: [
        { id: newId(), label: 'Crypto seed phrase', value: '' },
        { id: newId(), label: 'Neobank PIN', value: '' },
        { id: newId(), label: 'Private key (if applicable)', value: '' },
      ],
      business_ip: [
        { id: newId(), label: 'Domain registrar login', value: '' },
        { id: newId(), label: 'Shopify admin access', value: '' },
        { id: newId(), label: 'Social media handles + recovery', value: '' },
      ],
      sentimental: [
        { id: newId(), label: 'Photo cloud master password', value: '' },
        { id: newId(), label: 'Final letter / note', value: '', kind: 'note' },
      ],
      admin: [
        { id: newId(), label: 'Home security code', value: '' },
        { id: newId(), label: 'Utility account numbers', value: '' },
      ],
    },
  }
}

function IconShield(props: { size?: number }) {
  const size = props.size ?? 18
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <path d="M12 6v14" stroke="var(--accent)" strokeWidth="1.2" opacity="0.35" />
    </svg>
  )
}

function IconBriefcase(props: { size?: number }) {
  const size = props.size ?? 18
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6V5a2 2 0 012-2h2a2 2 0 012 2v1"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <path
        d="M4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <path d="M4 12h16" stroke="var(--accent)" strokeWidth="1.2" opacity="0.35" />
    </svg>
  )
}

function IconQuill(props: { size?: number }) {
  const size = props.size ?? 18
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M20 4c-7 1-12 6-13 13l-3 3 3-7c1-7 6-12 13-9z"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <path d="M9 15l6-6" stroke="var(--accent)" strokeWidth="1.2" opacity="0.35" />
    </svg>
  )
}

function IconHome(props: { size?: number }) {
  const size = props.size ?? 18
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11l8-7 8 7v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9z"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <path d="M10 22v-7h4v7" stroke="var(--accent)" strokeWidth="1.2" opacity="0.35" />
    </svg>
  )
}

function IconLock(props: { size?: number }) {
  const size = props.size ?? 18
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 11V8a5 5 0 0110 0v3"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6 11h12v9a2 2 0 01-2 2H8a2 2 0 01-2-2v-9z"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <path d="M12 14v4" stroke="var(--accent)" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
    </svg>
  )
}

function AutoTextarea(props: {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.max(52, el.scrollHeight)}px`
  }, [props.value])

  return (
    <textarea
      ref={ref}
      value={props.value}
      onChange={(e: any) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      rows={2}
      style={{ resize: 'none', lineHeight: 1.5 }}
    />
  )
}

export function VaultAssetEntry() {
  if (supabaseMissingEnv) return <div style={{ padding: 24 }}>{supabaseMissingEnv}</div>

  const [masterPassword, setMasterPassword] = useState('')
  const [recoveryKeyB64, setRecoveryKeyB64] = useState('')
  const [recoveryMasterKeyB64, setRecoveryMasterKeyB64] = useState<string | null>(null)
  const [vaultId, setVaultId] = useState<string | null>(null)
  const [payload, setPayload] = useState<VaultPayloadV1>(() => templatePayload())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [lockPulse, setLockPulse] = useState(0)
  const [progressPulse, setProgressPulse] = useState(0)
  const [strengthDisplayPct, setStrengthDisplayPct] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [recoveryBannerDismissed, setRecoveryBannerDismissed] = useState(false)
  const [recoveryKitDownloaded, setRecoveryKitDownloaded] = useState(false)
  const [recoveryConfirmOpen, setRecoveryConfirmOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [billingPlan, setBillingPlan] = useState<'free' | 'pro' | 'unknown'>('unknown')
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

  const categories = useMemo(
    () =>
      [
        {
          key: 'financials' as const,
          title: 'Financials',
          subtitle: 'High-value, easily lost',
          icon: <IconShield />,
        },
        {
          key: 'business_ip' as const,
          title: 'Business IP',
          subtitle: 'Business continuity',
          icon: <IconBriefcase />,
        },
        {
          key: 'sentimental' as const,
          title: 'Sentimental',
          subtitle: 'Emotional closure',
          icon: <IconQuill />,
        },
        {
          key: 'admin' as const,
          title: 'Admin',
          subtitle: 'Day 1 practical needs',
          icon: <IconHome />,
        },
      ] as const,
    []
  )

  useEffect(() => {
    let isCancelled = false
    const client = supabase!

    const run = async () => {
      setIsLoading(true)
      setError(null)
      setNotice(null)
      setStatus(null)

      const { data: sessionData } = await client.auth.getSession()
      const session = sessionData.session
      setIsConnected(!!session)
      setSessionUserId(session?.user?.id ?? null)

      if (!session) {
        setIsLoading(false)
        setIsUnlocked(false)
        setRecoveryMasterKeyB64(null)
        setBillingPlan('unknown')
        setNotice('Sign in required')
        return
      }

      const { data: billingRow, error: billingErr } = await client
        .from('user_billing')
        .select('plan')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (isCancelled) return

      if (billingErr) {
        const msg = billingErr.message ?? ''
        if (/could not find the table|schema cache/i.test(msg)) {
          setBillingPlan('unknown')
        } else {
          setBillingPlan('unknown')
        }
      } else {
        const plan = (billingRow as any)?.plan
        setBillingPlan(plan === 'pro' ? 'pro' : 'free')
      }

      const { data, error: fetchError } = await client
        .from('vaults')
        .select('id,kdf_params,vault_ciphertext,owner_wrapped_dek')
        .maybeSingle()

      if (isCancelled) return

      if (fetchError) {
        const msg = fetchError.message ?? ''
        if (/could not find the table|schema cache/i.test(msg)) {
          setNotice('Database not initialized')
          setStatus(null)
          setError(null)
        } else {
          setError(msg)
        }
        setIsLoading(false)
        return
      }

      if (data?.id) setVaultId(data.id)
      setRecoveryMasterKeyB64(null)
      setIsUnlocked(false)
      setIsLoading(false)
      setStatus(data?.id ? 'Vault found. Enter Vault Password to unlock.' : 'No vault yet. Fill in your nest and save.')
    }

    const { data: authListener } = client.auth.onAuthStateChange(() => {
      void run()
    })

    void run()

    return () => {
      isCancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const checkout = q.get('checkout')
    if (!checkout) return
    if (checkout === 'success') setToast('Upgrade complete')
    if (checkout === 'cancel') setToast('Checkout canceled')
    q.delete('checkout')
    const next = `${window.location.pathname}${q.toString() ? `?${q.toString()}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', next)
  }, [])

  useEffect(() => {
    if (!isConnected || !sessionUserId) return
    const key = `welcome_back_toast_shown:${sessionUserId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setToast('Welcome back to your Nest — check your Nest Strength first.')
  }, [isConnected, sessionUserId])

  useEffect(() => {
    if (!vaultId) return
    const downloadedKey = `recovery_kit_downloaded:${vaultId}`
    const dismissedKey = `recovery_cta_dismissed:${vaultId}`
    setRecoveryKitDownloaded(localStorage.getItem(downloadedKey) === '1')
    setRecoveryBannerDismissed(localStorage.getItem(dismissedKey) === '1')
  }, [vaultId])

  useEffect(() => {
    if (!recoveryConfirmOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRecoveryConfirmOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [recoveryConfirmOpen])

  const updateItem = (category: CategoryKey, id: string, patch: Partial<AssetItem>) => {
    setPayload((prev: VaultPayloadV1) => {
      const nextItems = prev.categories[category].map((it: AssetItem) =>
        it.id === id ? { ...it, ...patch } : it
      )
      return { ...prev, categories: { ...prev.categories, [category]: nextItems } }
    })
    setLockPulse((n) => n + 1)
  }

  const addItem = (category: CategoryKey) => {
    setPayload((prev: VaultPayloadV1) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: [...prev.categories[category], { id: newId(), label: 'New item', value: '', kind: 'secret' }],
      },
    }))
    setLockPulse((n) => n + 1)
  }

  const startCheckout = async () => {
    setError(null)
    setNotice(null)
    const client = supabase!
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) {
      setNotice('Sign in required')
      return
    }

    capture('checkout_started', { distinct_id: sessionData.session.user.id })
    setIsStartingCheckout(true)
    try {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
      const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined
      if (!supabaseUrl || !supabaseAnonKey) {
        setError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
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
          success_url: `${window.location.origin}/vault?checkout=success`,
          cancel_url: `${window.location.origin}/vault?checkout=cancel`,
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
      setIsStartingCheckout(false)
    }
  }

  const openBillingPortal = async () => {
    setError(null)
    setNotice(null)
    const client = supabase!
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) {
      setNotice('Sign in required')
      return
    }

    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
      return
    }

    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/stripe-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'x-user-jwt': sessionData.session.access_token,
      },
      body: JSON.stringify({ return_url: `${window.location.origin}/vault` }),
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
  }

  const unlock = async () => {
    setError(null)
    setNotice(null)
    setStatus(null)

    if (!masterPassword) {
      setNotice('Enter your Vault Password')
      return
    }

    const client = supabase!
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) {
      setNotice('Sign in required')
      return
    }
    const { data, error: fetchError } = await client
      .from('vaults')
      .select('id,kdf_params,vault_ciphertext,owner_wrapped_dek')
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    if (!data) {
      setStatus('No vault yet. Fill in your nest and save.')
      return
    }

    try {
      const passwordKey = await deriveMasterKey(masterPassword, data.kdf_params)
      const masterKeyBytes = await unwrapDek(passwordKey, data.owner_wrapped_dek)
      const masterKeyB64 = bytesToB64(masterKeyBytes)
      setRecoveryMasterKeyB64(masterKeyB64)
      setIsUnlocked(true)

      const masterKey = await importDekKey(masterKeyBytes)
      const decoded = (await decryptVaultJson(masterKey, data.vault_ciphertext)) as VaultPayloadV1
      if (decoded?.v !== 1) throw new Error('Unsupported vault format')
      setVaultId(data.id)
      setPayload(decoded)
      setStatus('Unlocked')
    } catch {
      setError('Could not decrypt. Check your Vault Password.')
    }
  }

  const unlockWithRecoveryKey = async () => {
    setError(null)
    setNotice(null)
    setStatus(null)

    const key = recoveryKeyB64.trim()
    if (!key) {
      setNotice('Enter your Recovery Key')
      return
    }

    const client = supabase!
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) {
      setNotice('Sign in required')
      return
    }
    const { data, error: fetchError } = await client
      .from('vaults')
      .select('id,kdf_params,vault_ciphertext,owner_wrapped_dek')
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    if (!data) {
      setStatus('No vault yet. Fill in your nest and save.')
      return
    }

    try {
      const masterKeyBytes = b64ToBytes(key)
      const masterKey = await importDekKey(masterKeyBytes)
      const decoded = (await decryptVaultJson(masterKey, data.vault_ciphertext)) as VaultPayloadV1
      if (decoded?.v !== 1) throw new Error('Unsupported vault format')
      setVaultId(data.id)
      setPayload(decoded)
      setRecoveryMasterKeyB64(key)
      setIsUnlocked(true)
      setStatus('Unlocked with Recovery Key')
    } catch {
      setError('Could not decrypt with Recovery Key.')
    }
  }

  const downloadRecoveryPdf = async () => {
    setError(null)
    setNotice(null)
    setStatus(null)

    if (!vaultId) {
      setError('Save your vault first, then download your Recovery PDF')
      return
    }

    const masterKeyB64 = recoveryMasterKeyB64?.trim()
    if (!masterKeyB64) {
      setError('Unlock first to generate your Recovery PDF')
      return
    }

    setIsDownloading(true)
    try {
      const bytes = await generateRecoveryPdf({ vaultId, masterKeyB64 })
      const safeBytes = new Uint8Array(bytes)
      const blob = new Blob([safeBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evernest-recovery-kit-${vaultId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      localStorage.setItem(`recovery_kit_downloaded:${vaultId}`, '1')
      setRecoveryKitDownloaded(true)
      setStatus('Recovery PDF downloaded')
      if (sessionUserId) capture('recovery_kit_downloaded', { distinct_id: sessionUserId })
    } catch {
      setError('Failed to generate Recovery PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const requestRecoveryPdfDownload = () => {
    if (!vaultId) {
      void downloadRecoveryPdf()
      return
    }
    const confirmedKey = `recovery_download_confirmed:${vaultId}`
    const alreadyConfirmed = localStorage.getItem(confirmedKey) === '1'
    if (alreadyConfirmed) {
      void downloadRecoveryPdf()
      return
    }
    setRecoveryConfirmOpen(true)
  }

  const save = async () => {
    setIsSaving(true)
    setError(null)
    setNotice(null)
    setStatus(null)

    if (!masterPassword) {
      setIsSaving(false)
      setNotice('Enter your Vault Password before saving')
      return
    }

    const client = supabase!
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) {
      setIsSaving(false)
      setNotice('Sign in required')
      return
    }

    const { data: existing, error: fetchError } = await client
      .from('vaults')
      .select('id,kdf_params,vault_ciphertext,owner_wrapped_dek')
      .maybeSingle()

    if (fetchError) {
      setIsSaving(false)
      setError(fetchError.message)
      return
    }

    const nowIso = new Date().toISOString()

    try {
      if (!existing) {
        const kdf = newKdfParams()
        const passwordKey = await deriveMasterKey(masterPassword, kdf)
        const masterKeyBytes = newDekBytes()
        const masterKeyB64 = bytesToB64(masterKeyBytes)
        setRecoveryMasterKeyB64(masterKeyB64)
        setIsUnlocked(true)

        const masterKey = await importDekKey(masterKeyBytes)

        const tempVaultId = crypto.randomUUID()
        const aad = new TextEncoder().encode(`vault:${tempVaultId}`)
        const wrappedDek = await wrapDek(passwordKey, masterKeyBytes, aad)
        const ciphertext = await encryptVaultJson(masterKey, aad, payload)

        const { data: inserted, error: insertError } = await client
          .from('vaults')
          .insert({
            id: tempVaultId,
            owner_id: sessionData.session.user.id,
            kdf_params: kdf,
            owner_wrapped_dek: wrappedDek,
            vault_ciphertext: ciphertext,
            updated_at: nowIso,
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        setVaultId(inserted.id)
        setStatus('Saved. Download your Recovery PDF and store it in a physical safe.')
        setToast('Encrypted & Stored')
        const target = computeStrengthPct(payload)
        capture('vault_saved', { distinct_id: sessionData.session.user.id, is_new: true, strength_pct: target })
        setStrengthDisplayPct(Math.max(0, target - 12))
        requestAnimationFrame(() => setStrengthDisplayPct(target))
        setProgressPulse((n) => n + 1)
        setLockPulse((n) => n + 1)
        setIsSaving(false)
        return
      }

      const passwordKey = await deriveMasterKey(masterPassword, existing.kdf_params)

      let masterKeyBytes: Uint8Array
      try {
        masterKeyBytes = await unwrapDek(passwordKey, existing.owner_wrapped_dek)
      } catch {
        throw new Error('Could not decrypt. Check your Vault Password.')
      }

      setRecoveryMasterKeyB64(bytesToB64(masterKeyBytes))
      setIsUnlocked(true)
      const masterKey = await importDekKey(masterKeyBytes)
      const ciphertext = await encryptVaultJson(masterKey, new TextEncoder().encode(`vault:${existing.id}`), payload)

      const { error: updateError } = await client
        .from('vaults')
        .update({
          vault_ciphertext: ciphertext,
          updated_at: nowIso,
        })
        .eq('id', existing.id)

      if (updateError) throw updateError
      setVaultId(existing.id)
      setStatus('Saved')
      setToast('Encrypted & Stored')
      const target = computeStrengthPct(payload)
      capture('vault_saved', { distinct_id: sessionData.session.user.id, is_new: false, strength_pct: target })
      setStrengthDisplayPct(Math.max(0, target - 12))
      requestAnimationFrame(() => setStrengthDisplayPct(target))
      setProgressPulse((n) => n + 1)
      setLockPulse((n) => n + 1)
      setIsSaving(false)
    } catch (e: any) {
      setIsSaving(false)
      setError(e?.message ?? 'Save failed')
    }
  }

  const strengthPct = computeStrengthPct(payload)
  const showRecoveryBanner = !!vaultId && !recoveryKitDownloaded && !recoveryBannerDismissed
  useEffect(() => setStrengthDisplayPct(strengthPct), [strengthPct])

  const mustUnlockToSave = !!vaultId && !isUnlocked
  const saveDisabled = isSaving || !isConnected || !masterPassword.trim() || mustUnlockToSave

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <div className="statusBar" style={{ marginBottom: 14 }}>
          <div className="statusLeft">
            <span
              className={[
                'statusDot',
                !isConnected ? 'bad' : isUnlocked ? 'ok' : 'warn',
              ].join(' ')}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>
                {!isConnected ? 'Not Connected' : isUnlocked ? 'Securely Connected' : 'Connected (Locked)'}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {!isConnected
                  ? 'Sign in to access your vault'
                  : isUnlocked
                    ? 'End-to-end encrypted in your browser'
                    : 'Enter your Vault Password to decrypt locally'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {billingPlan === 'pro' ? (
              <>
                <div className="pill" style={{ fontSize: 12 }}>
                  Pro
                </div>
                <button type="button" onClick={() => void openBillingPortal()} disabled={!isConnected}>
                  Manage Billing
                </button>
              </>
            ) : billingPlan === 'free' ? (
              <button type="button" onClick={() => void startCheckout()} disabled={!isConnected || isStartingCheckout}>
                {isStartingCheckout ? 'Opening…' : 'Upgrade'}
              </button>
            ) : null}
            <div className="pill" style={{ fontSize: 12 }}>
              AES-256-GCM
            </div>
          </div>
        </div>

        {showRecoveryBanner ? (
          <div className="banner" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>
                  Your Vault Password is not stored.
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Download your Emergency Recovery Kit and store it in a physical safe.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!vaultId) return
                  localStorage.setItem(`recovery_cta_dismissed:${vaultId}`, '1')
                  setRecoveryBannerDismissed(true)
                }}
                style={{ padding: '6px 10px' }}
              >
                Dismiss
              </button>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" onClick={() => requestRecoveryPdfDownload()} disabled={isSaving || isDownloading}>
                {isDownloading ? 'Preparing…' : 'Download Recovery PDF'}
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                {isUnlocked ? 'Ready to export.' : 'Unlock first to export.'}
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, letterSpacing: -0.4 }}>Evernest</h1>
            <div className="muted" style={{ marginTop: 6 }}>
              {isConnected ? 'Welcome back to your Nest. Start with Nest Strength.' : 'Guided inventory for the people you love'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pill">
              <span key={lockPulse} className="lockPulse" style={{ display: 'inline-flex' }}>
                <IconLock size={16} />
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Encrypted</span>
            </span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nest Strength</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{strengthDisplayPct}%</div>
          </div>
          <div className="progressTrack" style={{ marginTop: 8 }}>
            <div
              key={progressPulse}
              className="progressFill progressPulse"
              style={{ width: `${strengthDisplayPct}%` }}
            />
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            {!isConnected ? 'Sign in to begin.' : 'Fill in more items to strengthen your nest.'}
          </div>
        </div>

        <div className="vaultTopGrid" style={{ marginTop: 16 }}>
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!saveDisabled) void save()
              }}
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <input
                type="password"
                value={masterPassword}
                onChange={(e: any) => setMasterPassword(e.target.value)}
                placeholder="Vault Password (used for encryption, never sent to server)"
              />
              <button type="submit" className="primary" disabled={saveDisabled}>
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </form>
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Evernest cannot reset this Vault Password. Store your Emergency Recovery Kit offline.
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <button type="button" onClick={() => void unlock()} disabled={isSaving}>
                Unlock
              </button>
              {vaultId ? (
                <span className="pill" style={{ fontSize: 12 }}>
                  Vault {vaultId.slice(0, 8)}…
                </span>
              ) : null}
            </div>
            {mustUnlockToSave ? (
              <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                Unlock your vault before saving changes.
              </div>
            ) : null}
          </div>

          <div>
            <input
              value={recoveryKeyB64}
              onChange={(e: any) => setRecoveryKeyB64(e.target.value)}
              placeholder="Recovery Key (base64)"
            />
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={() => void unlockWithRecoveryKey()} disabled={isSaving} style={{ width: '100%' }}>
                Unlock with Recovery Key
              </button>
            </div>
          </div>
        </div>

        {notice ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>{notice}</span>
              {!isConnected ? <Link to="/login">Sign In</Link> : null}
            </div>
            {notice === 'Sign in required' ? (
              <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                Sign in is required to load/save your vault. Vault encryption (Vault Password) happens locally after login.
              </div>
            ) : notice === 'Database not initialized' ? (
              <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                Run the SQL in supabase_schema_zero_knowledge.sql in your Supabase project, then refresh.
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}
        {status ? <div className="muted" style={{ marginTop: 8 }}>{status}</div> : null}
      </div>

      {categories.map((cat) => (
        <div key={cat.key} className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pill">{cat.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: -0.2 }}>{cat.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {cat.subtitle}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => addItem(cat.key)} disabled={isSaving}>
              Add
            </button>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {payload.categories[cat.key].map((item) => {
              const isNote = item.kind === 'note' || item.label.toLowerCase().includes('letter')
              return (
                <div key={item.id} className="vaultItemRow">
                  <input value={item.label} onChange={(e: any) => updateItem(cat.key, item.id, { label: e.target.value })} />
                  {isNote ? (
                    <AutoTextarea
                      value={item.value}
                      onChange={(v) => updateItem(cat.key, item.id, { value: v, kind: 'note' })}
                      placeholder="Write here… (encrypted as you type)"
                    />
                  ) : (
                    <input
                      value={item.value}
                      onChange={(e: any) => updateItem(cat.key, item.id, { value: e.target.value })}
                      placeholder="Encrypted value (seeds, PINs, links…) "
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {recoveryConfirmOpen ? (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setRecoveryConfirmOpen(false)}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>One-time confirmation</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
              This PDF contains your Recovery Master Key. Anyone with this document can decrypt your vault.
            </div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
              Store it in a physical safe. Do not screenshot it, email it, or store it in cloud notes.
            </div>
            <div className="modalActions">
              <button type="button" onClick={() => setRecoveryConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  if (vaultId) localStorage.setItem(`recovery_download_confirmed:${vaultId}`, '1')
                  setRecoveryConfirmOpen(false)
                  void downloadRecoveryPdf()
                }}
              >
                I Understand — Download
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toastWrap">
          <div className="toast">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconLock size={16} />
              <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{toast}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

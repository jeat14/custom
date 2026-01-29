import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseMissingEnv } from '../supabaseClient'
import {
  aesGcmDecrypt,
  b64ToBytes,
  decryptVaultJson,
  deriveAesKeyFromEcdh,
  deriveMasterKey,
  HeirEcdhPrivateWrapped,
  importDekKey,
  importEcdhP256PrivateKey,
  importEcdhP256PublicKey,
  KdfParams,
  makeVaultAad,
  newKdfParams,
  ShareBPackage,
  unwrapBytes,
  VaultCiphertext,
  wrapBytes,
  xor32,
} from '../crypto/zk'
import type { VaultPayloadV1 } from './WarmNestRenderer'
import { WarmNestRenderer } from './WarmNestRenderer'

type VaultRow = {
  id: string
  vault_ciphertext: VaultCiphertext
}

type HeirVaultRow = {
  vault_id: string
}

type VerificationRow = {
  id: string
  status: string
  reject_reason: string | null
  proof_of_death_path: string | null
  updated_at: string
}

type KeyMaterialRow = {
  user_id: string
  heir_ecdh_public_jwk: JsonWebKey
  heir_ecdh_private_wrapped: HeirEcdhPrivateWrapped
  kdf_params: KdfParams
}

function decodeShareBBytes(bytes: Uint8Array) {
  if (bytes.length === 32) return bytes
  const asText = new TextDecoder().decode(bytes).trim()
  if (/^[A-Za-z0-9+/=]+$/.test(asText)) {
    try {
      const b = b64ToBytes(asText)
      if (b.length === 32) return b
    } catch {
    }
  }
  throw new Error('Invalid shareB format')
}

export function HeirHandover() {
  if (supabaseMissingEnv) return <div style={{ padding: 24 }}>{supabaseMissingEnv}</div>

  const [vaults, setVaults] = useState<{ id: string }[]>([])
  const [selectedVaultId, setSelectedVaultId] = useState<string>('')
  const [vaultCiphertext, setVaultCiphertext] = useState<VaultCiphertext | null>(null)
  const [shareA, setShareA] = useState<Uint8Array | null>(null)
  const [shareBPackage, setShareBPackage] = useState<ShareBPackage | null>(null)
  const [verification, setVerification] = useState<VerificationRow | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isSubmittingProof, setIsSubmittingProof] = useState(false)

  const [keyMaterial, setKeyMaterial] = useState<KeyMaterialRow | null>(null)
  const [heirPassword, setHeirPassword] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [heirPrivKey, setHeirPrivKey] = useState<CryptoKey | null>(null)

  const [setupPassword, setSetupPassword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [decryptedPayload, setDecryptedPayload] = useState<VaultPayloadV1 | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let isCancelled = false

    const run = async () => {
      setIsLoading(true)
      setError(null)
      setNotice(null)

      const client = supabase!
      const { data: sessionData } = await client.auth.getSession()
      if (!sessionData.session) {
        setIsLoading(false)
        setNotice('Sign in required')
        return
      }

      const { data: keyRows, error: keyErr } = await client
        .from('user_key_material')
        .select('user_id,heir_ecdh_public_jwk,heir_ecdh_private_wrapped,kdf_params')
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle()

      if (isCancelled) return

      if (keyErr) {
        setError(keyErr.message)
        setIsLoading(false)
        return
      }
      setKeyMaterial((keyRows ?? null) as any)

      const { data: heirRows, error: vaultErr } = await client
        .from('vault_heirs')
        .select('vault_id')
        .eq('heir_user_id', sessionData.session.user.id)

      if (isCancelled) return

      if (vaultErr) {
        const msg = vaultErr.message ?? ''
        if (/could not find the table|schema cache/i.test(msg)) {
          setNotice('Database not initialized')
        } else {
          setError(msg)
        }
        setIsLoading(false)
        return
      }

      const list = ((heirRows ?? []) as any as HeirVaultRow[]).map((r) => ({ id: r.vault_id }))
      setVaults(list)
      if (list.length === 1) setSelectedVaultId(list[0].id)
      setIsLoading(false)
    }

    void run()
    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const run = async () => {
      if (!selectedVaultId) return

      setError(null)
      setNotice(null)
      setIsWorking(true)
      setShareA(null)
      setShareBPackage(null)
      setVaultCiphertext(null)
      setDecryptedPayload(null)
      setIsUnlocked(false)
      setHeirPrivKey(null)
      setVerification(null)

      const client = supabase!
      const { data: sessionData } = await client.auth.getSession()
      if (!sessionData.session) {
        setNotice('Sign in required')
        setIsWorking(false)
        return
      }

      const { data: verRow, error: verErr } = await client
        .from('vault_verification_requests')
        .select('id,status,reject_reason,proof_of_death_path,updated_at')
        .eq('vault_id', selectedVaultId)
        .eq('heir_user_id', sessionData.session.user.id)
        .maybeSingle()

      if (isCancelled) return

      if (verErr) {
        setError(verErr.message)
        setIsWorking(false)
        return
      }
      setVerification((verRow ?? null) as any)
      if ((verRow as any)?.status !== 'approved') {
        setIsWorking(false)
        return
      }
      const { data: v, error: vErr } = await client
        .from('vaults')
        .select('id,vault_ciphertext')
        .eq('id', selectedVaultId)
        .eq('id', selectedVaultId)
        .single()

      if (isCancelled) return

      if (vErr) {
        setError(vErr.message)
        setIsWorking(false)
        return
      }
      setVaultCiphertext((v as any).vault_ciphertext as VaultCiphertext)

      const { data: shareRows, error: shareErr } = await client
        .from('vault_server_shares')
        .select('share_a_b64')
        .eq('vault_id', selectedVaultId)
        .single()

      if (isCancelled) return

      if (shareErr) {
        setError(shareErr.message)
        setIsWorking(false)
        return
      }
      setShareA(b64ToBytes((shareRows as any).share_a_b64))

      const { data: bRows, error: bErr } = await client
        .from('vault_heirs')
        .select('share_b_package')
        .eq('vault_id', selectedVaultId)
        .eq('heir_user_id', sessionData.session.user.id)
        .maybeSingle()

      if (isCancelled) return

      if (bErr) {
        setError(bErr.message)
        setIsWorking(false)
        return
      }
      setShareBPackage(((bRows as any)?.share_b_package ?? null) as ShareBPackage | null)

      setIsWorking(false)
    }

    void run()
    return () => {
      isCancelled = true
    }
  }, [selectedVaultId])

  const submitProof = async () => {
    setError(null)
    setNotice(null)
    if (!selectedVaultId) {
      setNotice('Select a vault')
      return
    }
    if (!proofFile) {
      setNotice('Choose a proof document file')
      return
    }

    setIsSubmittingProof(true)
    try {
      const client = supabase!
      const { data: sessionData } = await client.auth.getSession()
      if (!sessionData.session) {
        setNotice('Sign in required')
        return
      }

      const ext = proofFile.name.includes('.') ? proofFile.name.split('.').pop() : 'bin'
      const safeExt = (ext ?? 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
      const path = `vault/${selectedVaultId}/${sessionData.session.user.id}/${Date.now()}.${safeExt}`

      const { error: uploadErr } = await client.storage.from('proof-of-death').upload(path, proofFile, { upsert: true })
      if (uploadErr) throw uploadErr

      const { data: upserted, error: upsertErr } = await client.from('vault_verification_requests').upsert(
        {
          vault_id: selectedVaultId,
          heir_user_id: sessionData.session.user.id,
          status: 'pending',
          proof_of_death_path: path,
          reject_reason: null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'vault_id,heir_user_id' }
      )
      if (upsertErr) throw upsertErr

      setToast('Submitted for review')
      setProofFile(null)

      const { data: verRow } = await client
        .from('vault_verification_requests')
        .select('id,status,reject_reason,proof_of_death_path,updated_at')
        .eq('vault_id', selectedVaultId)
        .eq('heir_user_id', sessionData.session.user.id)
        .maybeSingle()
      setVerification((verRow ?? null) as any)
      setNotice('Verification pending. You will receive an update after review.')
    } catch (e: any) {
      setError(e?.message ?? 'Proof submission failed')
    } finally {
      setIsSubmittingProof(false)
    }
  }

  const setupKeyMaterial = async () => {
    setError(null)
    setNotice(null)
    const pw = setupPassword.trim()
    if (!pw) {
      setNotice('Create an Heir Password to protect your key')
      return
    }

    setIsWorking(true)
    try {
      const client = supabase!
      const { data: sessionData } = await client.auth.getSession()
      if (!sessionData.session) {
        setNotice('Sign in required')
        return
      }

      const kdf = newKdfParams()
      const mk = await deriveMasterKey(pw, kdf)
      const { publicKey, privateKey } = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
      )
      const pubJwk = await crypto.subtle.exportKey('jwk', publicKey)
      const privJwk = await crypto.subtle.exportKey('jwk', privateKey)

      const aad = new TextEncoder().encode(`heir-key:${sessionData.session.user.id}`)
      const wrapped = await wrapBytes(mk, new TextEncoder().encode(JSON.stringify(privJwk)), aad)

      const { error: upsertError } = await client.from('user_key_material').upsert({
        user_id: sessionData.session.user.id,
        heir_ecdh_public_jwk: pubJwk,
        heir_ecdh_private_wrapped: wrapped,
        kdf_params: kdf,
        updated_at: new Date().toISOString(),
      })

      if (upsertError) throw upsertError

      setKeyMaterial({
        user_id: sessionData.session.user.id,
        heir_ecdh_public_jwk: pubJwk,
        heir_ecdh_private_wrapped: wrapped,
        kdf_params: kdf,
      })
      setToast('Heir key created')
      setNotice('Your heir key is ready. Unlock it to decrypt released vaults.')
    } catch (e: any) {
      setError(e?.message ?? 'Key setup failed')
    } finally {
      setIsWorking(false)
    }
  }

  const unlockHeirKey = async () => {
    setError(null)
    setNotice(null)
    if (!keyMaterial) {
      setNotice('Create your heir key first')
      return
    }
    const pw = heirPassword.trim()
    if (!pw) {
      setNotice('Enter your Heir Password to unlock')
      return
    }
    setIsWorking(true)
    try {
      const mk = await deriveMasterKey(pw, keyMaterial.kdf_params)
      const bytes = await unwrapBytes(mk, keyMaterial.heir_ecdh_private_wrapped)
      const privJwk = JSON.parse(new TextDecoder().decode(bytes)) as JsonWebKey
      const privKey = await importEcdhP256PrivateKey(privJwk)
      setHeirPrivKey(privKey)
      setIsUnlocked(true)
      setToast('Unlocked')
    } catch {
      setError('Could not unlock heir key. Check your Heir Password.')
    } finally {
      setIsWorking(false)
    }
  }

  const decryptReleasedVault = async () => {
    setError(null)
    setNotice(null)
    if (!selectedVaultId) {
      setNotice('Select a vault')
      return
    }
    if (!vaultCiphertext || !shareA || !shareBPackage) {
      setNotice('Waiting for released vault data')
      return
    }
    if (!heirPrivKey) {
      setNotice('Unlock your heir key first')
      return
    }

    setIsWorking(true)
    try {
      const ephPub = await importEcdhP256PublicKey(shareBPackage.eph_pub_jwk)
      const salt = shareBPackage.salt_b64 ? b64ToBytes(shareBPackage.salt_b64) : makeVaultAad(selectedVaultId)
      const info = shareBPackage.info_b64 ? b64ToBytes(shareBPackage.info_b64) : new TextEncoder().encode('shareB')
      const aesKey = await deriveAesKeyFromEcdh({ privateKey: heirPrivKey, publicKey: ephPub, salt, info })
      const aad = shareBPackage.aad_b64 ? b64ToBytes(shareBPackage.aad_b64) : makeVaultAad(selectedVaultId)
      const shareBBytes = await aesGcmDecrypt(aesKey, { alg: 'AES-GCM', iv_b64: shareBPackage.iv_b64, ct_b64: shareBPackage.ct_b64 }, aad)
      const shareB = decodeShareBBytes(shareBBytes)

      const dekBytes = xor32(shareA, shareB)
      const dekKey = await importDekKey(dekBytes)
      const payload = (await decryptVaultJson(dekKey, vaultCiphertext)) as VaultPayloadV1
      if (!payload || payload.v !== 1 || !payload.categories) throw new Error('Unexpected vault format')
      setDecryptedPayload(payload)
      setToast('Decrypted')
    } catch (e: any) {
      setError(e?.message ?? 'Decryption failed')
    } finally {
      setIsWorking(false)
    }
  }

  const downloadJson = () => {
    if (!decryptedPayload || !selectedVaultId) return
    const blob = new Blob([new TextEncoder().encode(JSON.stringify(decryptedPayload, null, 2))], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evernest-vault-${selectedVaultId.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, letterSpacing: -0.4 }}>Heir Handover</h1>
            <div className="muted" style={{ marginTop: 6 }}>
              If a vault is released and you are approved, you can decrypt it locally in your browser.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/security">Security</Link>
            <Link to="/vault">Vault</Link>
          </div>
        </div>

        {notice ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{notice}</div>
            {notice === 'Database not initialized' ? (
              <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                Run supabase_schema_zero_knowledge.sql in Supabase, then refresh.
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <div className="error" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Step 1 — Select a released vault</div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          You will only see vaults where you are listed as an heir.
        </div>

        <div style={{ marginTop: 12 }}>
          <select
            value={selectedVaultId}
            onChange={(e: any) => setSelectedVaultId(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">Select…</option>
            {vaults.map((v) => (
              <option key={v.id} value={v.id}>
                Vault {v.id.slice(0, 8)}…
              </option>
            ))}
          </select>
        </div>

        {vaults.length === 0 ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            No released vaults are available for your account.
          </div>
        ) : null}
      </div>

      {selectedVaultId ? (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Step 2 — Duty-of-care safeguard</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            To access a released vault, submit proof for review. This safeguard prevents abuse. Once approved, you can decrypt locally in your browser.
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="pill" style={{ fontSize: 12, display: 'inline-flex' }}>
              {verification?.status === 'approved'
                ? 'Approved'
                : verification?.status === 'pending'
                  ? 'Pending review'
                  : verification?.status === 'rejected'
                    ? 'Rejected'
                    : 'Not submitted'}
            </div>
          </div>

          {verification?.status === 'rejected' && verification.reject_reason ? (
            <div className="error" style={{ marginTop: 10 }}>
              {verification.reject_reason}
            </div>
          ) : null}

          {verification?.status === 'approved' ? (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Approved. Continue below to unlock your heir key and decrypt.
            </div>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                onChange={(e: any) => setProofFile(e?.target?.files?.[0] ?? null)}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              />
              <button type="button" className="primary" onClick={() => void submitProof()} disabled={isSubmittingProof}>
                {isSubmittingProof ? 'Submitting…' : 'Submit proof'}
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                PDF or image. Uploaded to a private bucket.
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!keyMaterial ? (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Step 3 — Create your heir key</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            This password protects your private decryption key. Evernest cannot reset it.
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="password"
              value={setupPassword}
              onChange={(e: any) => setSetupPassword(e.target.value)}
              placeholder="Heir Password (never sent to server)"
            />
            <button type="button" className="primary" onClick={() => void setupKeyMaterial()} disabled={isWorking}>
              {isWorking ? 'Working…' : 'Create Heir Key'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>Step 3 — Unlock to decrypt</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Your heir key is stored encrypted. Unlocking happens locally in your browser.
          </div>

          {verification?.status !== 'approved' ? (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Verification is required before released vault data becomes accessible.
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="password"
              value={heirPassword}
              onChange={(e: any) => setHeirPassword(e.target.value)}
              placeholder="Heir Password"
            />
            <button type="button" onClick={() => void unlockHeirKey()} disabled={isWorking}>
              {isWorking ? 'Working…' : isUnlocked ? 'Unlocked' : 'Unlock'}
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => void decryptReleasedVault()}
              disabled={isWorking || !isUnlocked}
            >
              Decrypt
            </button>
            <button type="button" onClick={() => downloadJson()} disabled={!decryptedPayload}>
              Download JSON
            </button>
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Decryption happens locally. Nothing is sent to the server.
          </div>
        </div>
      )}

      {decryptedPayload ? (
        <WarmNestRenderer
          payload={decryptedPayload}
          title="Warm Nest"
          subtitle="A quiet, read-only view of what they left behind."
        />
      ) : null}

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

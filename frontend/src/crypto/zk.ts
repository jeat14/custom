const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function b64encode(bytes: Uint8Array) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function b64decode(b64: string) {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function bytesToB64(bytes: Uint8Array) {
  return b64encode(bytes)
}

export function b64ToBytes(b64: string) {
  return b64decode(b64)
}

export type KdfParams = {
  alg: 'PBKDF2'
  hash: 'SHA-256'
  salt_b64: string
  iterations: number
}

export type AesGcmBlob = {
  alg: 'AES-GCM'
  iv_b64: string
  ct_b64: string
}

export type VaultCiphertext = {
  v: 1
  alg: 'AES-GCM'
  aad_b64: string
  iv_b64: string
  ct_b64: string
}

export async function deriveMasterKey(masterPassword: string, kdf: KdfParams) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: b64decode(kdf.salt_b64),
      iterations: kdf.iterations,
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export function makeVaultAad(vaultId: string) {
  return textEncoder.encode(`vault:${vaultId}`)
}

export function newKdfParams() {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return {
    alg: 'PBKDF2' as const,
    hash: 'SHA-256' as const,
    salt_b64: b64encode(salt),
    iterations: 600_000,
  }
}

export async function importDekKey(dekBytes: Uint8Array) {
  return crypto.subtle.importKey('raw', dekBytes as unknown as BufferSource, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

export function newDekBytes() {
  return crypto.getRandomValues(new Uint8Array(32))
}

export async function aesGcmEncrypt(key: CryptoKey, plaintext: Uint8Array, aad?: Uint8Array): Promise<AesGcmBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const alg = aad ? { name: 'AES-GCM', iv, additionalData: aad } : { name: 'AES-GCM', iv }
  const ct = new Uint8Array(await crypto.subtle.encrypt(alg, key, plaintext as unknown as BufferSource))
  return { alg: 'AES-GCM', iv_b64: b64encode(iv), ct_b64: b64encode(ct) }
}

export async function aesGcmDecrypt(key: CryptoKey, blob: AesGcmBlob, aad?: Uint8Array) {
  const iv = b64decode(blob.iv_b64)
  const ct = b64decode(blob.ct_b64)
  const alg = aad ? { name: 'AES-GCM', iv, additionalData: aad } : { name: 'AES-GCM', iv }
  const pt = await crypto.subtle.decrypt(alg, key, ct)
  return new Uint8Array(pt)
}

export async function wrapDek(masterKey: CryptoKey, dekBytes: Uint8Array, aad: Uint8Array): Promise<VaultCiphertext> {
  const blob = await aesGcmEncrypt(masterKey, dekBytes, aad)
  return { v: 1, alg: 'AES-GCM', aad_b64: b64encode(aad), iv_b64: blob.iv_b64, ct_b64: blob.ct_b64 }
}

export async function unwrapDek(masterKey: CryptoKey, wrapped: VaultCiphertext) {
  const aad = b64decode(wrapped.aad_b64)
  return aesGcmDecrypt(masterKey, { alg: 'AES-GCM', iv_b64: wrapped.iv_b64, ct_b64: wrapped.ct_b64 }, aad)
}

export async function encryptVaultJson(dekKey: CryptoKey, aad: Uint8Array, payload: unknown): Promise<VaultCiphertext> {
  const bytes = textEncoder.encode(JSON.stringify(payload))
  const blob = await aesGcmEncrypt(dekKey, bytes, aad)
  return { v: 1, alg: 'AES-GCM', aad_b64: b64encode(aad), iv_b64: blob.iv_b64, ct_b64: blob.ct_b64 }
}

export async function decryptVaultJson(dekKey: CryptoKey, ciphertext: VaultCiphertext) {
  const aad = b64decode(ciphertext.aad_b64)
  const bytes = await aesGcmDecrypt(dekKey, ciphertext, aad)
  return JSON.parse(textDecoder.decode(bytes)) as unknown
}

export async function wrapBytes(masterKey: CryptoKey, bytes: Uint8Array, aad: Uint8Array): Promise<VaultCiphertext> {
  const blob = await aesGcmEncrypt(masterKey, bytes, aad)
  return { v: 1, alg: 'AES-GCM', aad_b64: b64encode(aad), iv_b64: blob.iv_b64, ct_b64: blob.ct_b64 }
}

export async function unwrapBytes(masterKey: CryptoKey, wrapped: VaultCiphertext) {
  const aad = b64decode(wrapped.aad_b64)
  return aesGcmDecrypt(masterKey, { alg: 'AES-GCM', iv_b64: wrapped.iv_b64, ct_b64: wrapped.ct_b64 }, aad)
}

export function xor32(a: Uint8Array, b: Uint8Array) {
  if (a.length !== 32 || b.length !== 32) throw new Error('Expected 32-byte shares')
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) out[i] = a[i] ^ b[i]
  return out
}

export type HeirEcdhPrivateWrapped = VaultCiphertext

export type ShareBPackage = {
  v: 1
  alg: 'ECDH-P256-HKDF-SHA256-AES-GCM'
  eph_pub_jwk: JsonWebKey
  iv_b64: string
  ct_b64: string
  salt_b64?: string
  info_b64?: string
  aad_b64?: string
}

export async function importEcdhP256PublicKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
}

export async function importEcdhP256PrivateKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
}

export async function deriveAesKeyFromEcdh(params: {
  privateKey: CryptoKey
  publicKey: CryptoKey
  salt?: Uint8Array
  info?: Uint8Array
}) {
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: params.publicKey }, params.privateKey, 256)
  const baseKey = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey'])
  const salt = params.salt ?? new Uint8Array()
  const info = params.info ?? new Uint8Array()
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as unknown as BufferSource, info: info as unknown as BufferSource },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

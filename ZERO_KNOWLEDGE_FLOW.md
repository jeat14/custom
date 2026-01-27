# Zero-Knowledge Vault Flow (Step 1 Design)

This document defines the client-side encryption (“zero-knowledge”) flow for **Digital Estate Planning** so the server stores only ciphertext and cannot decrypt user vault contents.

## Goals

- Server never receives the Master Password or any derived decryption key.
- Vault contents (“Succession Map”: CSV/text/links) are encrypted **in the browser** before upload.
- Database stores only ciphertext + non-sensitive metadata required to decrypt client-side (KDF params, IVs, algorithm/version identifiers).
- Handover supports a 2-condition unlock:
  1) dead-man switch is triggered, and  
  2) an heir proves identity (authenticated) and provides their own verified key (unlocks their local private key / device key).

## Non-goals (for this step)

- Perfect protection against a fully compromised client device/browser.
- A cryptographic escrow/recovery that works without the heir having any prior setup.
- Legal/time-of-death verification (this is policy/process; crypto just enforces access gates).

## Cryptography Choices

### Key Derivation (from Master Password)

Use WebCrypto SubtleCrypto KDF:

- Algorithm: PBKDF2-HMAC-SHA-256
- Salt: 16+ random bytes per user/vault (stored server-side)
- Iterations: choose a high default (e.g., 600k) and revisit via benchmarking
- Output: 256-bit AES key (Master Key, “MK”) used only to wrap the vault DEK

Rationale: PBKDF2 is available in all major browsers via SubtleCrypto. Argon2/scrypt would require additional WASM/libs.

### Encryption

- Vault encryption: AES-GCM (256-bit), random 96-bit IV per encryption
- DEK wrapping (owner): AES-GCM using MK, independent random IV
- Integrity: AES-GCM provides authenticated encryption; decryption fails if tampered

### Key Sharing (handover)

Use a **2-of-2 XOR split** of the vault DEK:

- Generate random `shareA` (32 bytes).
- Compute `shareB = DEK XOR shareA`.
- The server stores `shareA` but does not release it until dead-man switch triggers.
- `shareB` is encrypted to the heir (using the heir’s public key) and stored server-side.

Security property: neither share alone reveals DEK. The server can see `shareA` but cannot decrypt the vault because it lacks `shareB`.

### Heir Public Key (verified key)

Each heir account creates a local asymmetric keypair in the browser:

- Algorithm: ECDH P-256 (SubtleCrypto supports `ECDH`)
- Store: public key on server; private key encrypted client-side under heir’s own Master Password-derived key (same pattern as owner)

To encrypt `shareB` to an heir:

- Sender generates an ephemeral ECDH keypair and derives a shared secret with heir’s public key.
- Use HKDF-SHA-256 to derive an AES-GCM wrapping key from the shared secret.
- Encrypt `shareB` with AES-GCM; store ciphertext + ephemeral public key + IV.

## Data Model (Supabase/Postgres)

Below is a schema sketch. Names are suggestions; adjust to existing conventions.

### Tables

```sql
-- One logical vault per owner (or allow multiple vaults by removing the unique constraint)
create table if not exists public.vaults (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  kdf_params jsonb not null,                 -- { alg, hash, salt_b64, iterations }
  vault_ciphertext jsonb not null,           -- { v, alg, iv_b64, ct_b64, aad_b64? }
  owner_wrapped_dek jsonb not null,          -- { alg, iv_b64, ct_b64 }

  deadman_status text not null default 'active', -- active|pending|released
  last_checkin_at timestamptz not null default now(),
  release_after interval not null default interval '45 days',
  released_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(owner_id)
);

create table if not exists public.vault_heirs (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  heir_user_id uuid not null references auth.users(id) on delete cascade,

  -- Encrypted shareB package (encrypted to heir’s public key)
  share_b_package jsonb not null,            -- { v, alg, eph_pub_jwk, iv_b64, ct_b64 }

  created_at timestamptz not null default now(),
  unique(vault_id, heir_user_id)
);

-- The server-gated shareA (not sufficient to decrypt alone)
create table if not exists public.vault_server_shares (
  vault_id uuid primary key references public.vaults(id) on delete cascade,
  share_a_b64 text not null,                 -- base64(32 bytes)
  created_at timestamptz not null default now()
);

-- Heir key material: public ECDH key + encrypted private key blob
create table if not exists public.user_key_material (
  user_id uuid primary key references auth.users(id) on delete cascade,
  heir_ecdh_public_jwk jsonb not null,
  heir_ecdh_private_wrapped jsonb not null,  -- encrypted under heir MK (client-generated)
  kdf_params jsonb not null,                 -- for heir MK derivation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Row Level Security (RLS) principles

- `vaults`: owner can read/write always; heirs can read **only** after `deadman_status='released'`.
- `vault_server_shares`: owner can write; heirs can read only after released.
- `vault_heirs`: owner can manage; each heir can read their own row after released.
- `user_key_material`: only the user can read/write their own key material.

Example policy sketch (illustrative, not final):

```sql
alter table public.vaults enable row level security;

create policy "owner can read/write vault"
on public.vaults
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "heirs can read released vault"
on public.vaults
for select
using (
  deadman_status = 'released'
  and exists (
    select 1 from public.vault_heirs h
    where h.vault_id = vaults.id and h.heir_user_id = auth.uid()
  )
);
```

## Client-Side Flows

### 1) Registration

- User creates account (Supabase auth).
- User chooses a **Master Password** (MP) used only for local cryptography.
- Client generates `kdf_params` (salt + iterations) and stores them server-side (in `vaults` or `user_key_material`).
- MP is never sent to the server.

### 2) Vault Create/Update (owner)

1. Canonicalize plaintext Succession Map (e.g., store as UTF-8 string or JSON).
2. Generate random DEK (32 bytes).
3. Encrypt plaintext with DEK → `vault_ciphertext`.
4. Derive MK from MP using stored `kdf_params`.
5. Wrap DEK with MK → `owner_wrapped_dek`.
6. Upload `{ vault_ciphertext, owner_wrapped_dek, kdf_params }`.

### 3) Vault Read (owner)

1. Download `kdf_params`, `owner_wrapped_dek`, `vault_ciphertext`.
2. Derive MK from MP and unwrap DEK.
3. Decrypt `vault_ciphertext` with DEK.

### 4) Add/Update Heir (owner)

Precondition: heir account exists and has published `heir_ecdh_public_jwk`.

1. Ensure you have current DEK (unwrap from MK).
2. Create XOR shares: generate `shareA`, compute `shareB`.
3. Store `shareA` in `vault_server_shares`.
4. Encrypt `shareB` to heir public key and store `share_b_package` in `vault_heirs`.

### 5) Dead-Man Switch

- Owner periodically “check-ins” (updates `last_checkin_at`).
- A scheduled job (Supabase cron/Edge Function) computes:
  - if `now() > last_checkin_at + release_after`, set `deadman_status='released'` and `released_at=now()`.
- Until release, heirs cannot read vault ciphertext nor `shareA`.

### 6) Handover (heir)

1. Heir authenticates (Supabase auth).
2. If released, heir can fetch:
   - `vault_ciphertext`,
   - their `share_b_package`,
   - `shareA` from `vault_server_shares`.
3. Heir unlocks their private ECDH key locally using their Master Password.
4. Heir decrypts `shareB` from `share_b_package`.
5. Heir reconstructs `DEK = shareA XOR shareB`.
6. Heir decrypts the vault.

## WebCrypto Snippets (reference)

These are reference snippets to lock in the shape of the implementation; adjust as needed.

```js
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function b64encode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary);
}

function b64decode(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveMasterKey(masterPassword, saltBytes, iterations) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function aesGcmEncrypt(key, plaintextBytes, aadBytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const alg = aadBytes
    ? { name: "AES-GCM", iv, additionalData: aadBytes }
    : { name: "AES-GCM", iv };
  const ct = new Uint8Array(await crypto.subtle.encrypt(alg, key, plaintextBytes));
  return { iv_b64: b64encode(iv), ct_b64: b64encode(ct) };
}

async function aesGcmDecrypt(key, ivB64, ctB64, aadBytes) {
  const iv = b64decode(ivB64);
  const ct = b64decode(ctB64);
  const alg = aadBytes
    ? { name: "AES-GCM", iv, additionalData: aadBytes }
    : { name: "AES-GCM", iv };
  const pt = await crypto.subtle.decrypt(alg, key, ct);
  return new Uint8Array(pt);
}

function xorBytes(a, b) {
  if (a.length !== b.length) throw new Error("xor length mismatch");
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

function splitDekXor(dekBytes32) {
  const shareA = crypto.getRandomValues(new Uint8Array(32));
  const shareB = xorBytes(dekBytes32, shareA);
  return { shareA, shareB };
}
```

## Threat Model Notes (what this design defends)

- Database leak: attacker gets only ciphertext, salts, IVs, wrapped blobs, and key shares that are useless without a Master Password and/or heir private key.
- Server operator: cannot decrypt vault contents because the Master Password and derived keys never leave the client.

## Key Risks / Mitigations

- Weak Master Password: use strong password UX, guidance, and optional strength meter; consider adding optional Argon2 later.
- XSS: any script injection can steal plaintext before encryption; prioritize CSP, dependency hygiene, and input sanitization.
- Lost Master Password: no recovery by design (true zero-knowledge). Mitigate with explicit UX warnings and optional owner-generated recovery kit (separate feature).


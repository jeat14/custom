import { useEffect, useMemo, useRef } from 'react'

type CategoryKey = 'financials' | 'business_ip' | 'sentimental' | 'admin'

type AssetItem = {
  id: string
  label: string
  value: string
  kind?: 'secret' | 'note'
}

export type VaultPayloadV1 = {
  v: 1
  categories: Record<CategoryKey, AssetItem[]>
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
      <path d="M9 22v-7h6v7" stroke="var(--accent)" strokeWidth="1.2" opacity="0.35" />
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

function AutoTextarea(props: { value: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(260, el.scrollHeight)}px`
  }, [props.value])

  return (
    <textarea
      ref={ref}
      value={props.value}
      readOnly
      rows={2}
      style={{ resize: 'none', lineHeight: 1.5 }}
    />
  )
}

export function WarmNestRenderer(props: { payload: VaultPayloadV1; title?: string; subtitle?: string }) {
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

  return (
    <div style={{ marginTop: 18 }}>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>
              {props.title ?? 'Warm Nest'}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              {props.subtitle ?? 'Read-only view — decrypted locally in your browser.'}
            </div>
          </div>
          <span className="pill" style={{ fontSize: 12 }}>
            Read-only
          </span>
        </div>
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
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {props.payload.categories[cat.key].map((item) => {
              const isNote = item.kind === 'note' || item.label.toLowerCase().includes('letter')
              return (
                <div key={item.id} className="vaultItemRow">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      title="Encrypted on your device. Even Evernest cannot see this."
                      style={{ display: 'inline-flex', opacity: 0.9 }}
                    >
                      <IconLock size={16} />
                    </span>
                    <input value={item.label} readOnly />
                  </div>
                  {isNote ? <AutoTextarea value={item.value} /> : <input value={item.value} readOnly />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

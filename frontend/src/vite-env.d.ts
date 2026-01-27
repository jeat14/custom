interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_INACTIVITY_THRESHOLD?: string
  readonly VITE_WARNING_PERIOD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


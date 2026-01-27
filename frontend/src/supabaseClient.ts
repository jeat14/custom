import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseMissingEnv =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Create frontend/.env.local (copy from frontend/.env.example) and restart the dev server.'
    : null

export const supabase = supabaseMissingEnv ? null : createClient(supabaseUrl!, supabaseAnonKey!)

export function requireSupabase() {
  if (!supabase) throw new Error(supabaseMissingEnv ?? 'Supabase client not configured')
  return supabase
}

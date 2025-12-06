import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = (window.env?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string | undefined
const key = (window.env?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const SUPABASE_CONFIGURED = Boolean(url && key)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null
  if (!client) client = createClient(url!, key!)
  return client
}
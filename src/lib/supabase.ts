import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Auth Helpers
export const signUp = async (email: string, password: string, metadata: Record<string, unknown>) => {
  return supabase.auth.signUp({ email, password, options: { data: metadata } })
}

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password })
}

export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}

export const signOut = async () => {
  return supabase.auth.signOut()
}

export const getSession = async () => {
  return supabase.auth.getSession()
}

// Storage Helpers
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  return data
}

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Realtime Helper
export const subscribeToChannel = (
  channel: string,
  event: string,
  table: string,
  callback: (payload: unknown) => void
) => {
  return supabase
    .channel(channel)
    .on('postgres_changes', { event: event as 'INSERT' | 'UPDATE' | 'DELETE' | '*', schema: 'public', table }, callback)
    .subscribe()
}

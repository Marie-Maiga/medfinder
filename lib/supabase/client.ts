import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const isConfigured =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 10

export function createClient() {
  if (!isConfigured) {
    // Return a stub client when Supabase is not configured (local preview)
    return {
      auth: {
        signInWithPassword: async () => ({ error: { message: 'Supabase non configuré' } }),
        signOut: async () => {},
        getUser: async () => ({ data: { user: null } }),
      },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
    } as unknown as ReturnType<typeof createBrowserClient>
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

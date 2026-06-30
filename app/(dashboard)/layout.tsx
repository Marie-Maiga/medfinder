import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Auth client — reads user session from cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => allCookies,
        setAll: () => {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // Service client — always uses service role key, bypasses RLS
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let { data: profile } = await serviceClient
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!profile) {
    const { data: created } = await serviceClient
      .from('user_profiles')
      .upsert({
        id: session.user.id,
        full_name: session.user.email?.split('@')[0] ?? 'Admin',
        role: 'admin',
        is_active: true,
      }, { onConflict: 'id' })
      .select('full_name, role')
      .single()

    profile = created
  }

  const displayName = profile?.full_name ?? session.user.email ?? 'Admin'
  const displayRole = (profile?.role ?? 'admin') as 'admin' | 'operator'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={displayRole} userName={displayName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

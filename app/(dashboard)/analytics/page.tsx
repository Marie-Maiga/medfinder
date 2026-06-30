import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/ui/card'
import { ClipboardList, CheckCircle, Clock, Building2, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/requests')

  // Fetch stats
  const statsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/stats`, {
    headers: { Cookie: '' },
    cache: 'no-store',
  }).catch(() => null)

  const medsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/medicines-top?limit=10`, {
    cache: 'no-store',
  }).catch(() => null)

  const pharmRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/pharmacies-perf`, {
    cache: 'no-store',
  }).catch(() => null)

  // Server-side data fetch using supabase directly
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

  const [todayCount, weekCount, pendingCount, activePharm, completedWeek] = await Promise.all([
    supabase.from('requests').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('requests').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    supabase.from('requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'sent', 'partial']),
    supabase.from('pharmacies').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', weekAgo.toISOString()),
  ])

  const successRate = (weekCount.count ?? 0) > 0
    ? Math.round(((completedWeek.count ?? 0) / (weekCount.count ?? 1)) * 100)
    : 0

  // Top medicines
  const { data: medData } = await supabase
    .from('request_medicines')
    .select('name_raw')
    .gte('created_at', weekAgo.toISOString())

  const medCounts: Record<string, number> = {}
  for (const row of medData ?? []) {
    const k = row.name_raw.toLowerCase().trim()
    medCounts[k] = (medCounts[k] ?? 0) + 1
  }
  const topMeds = Object.entries(medCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name_raw, count]) => ({ name_raw, count }))

  // Top pharmacies
  const { data: topPharm } = await supabase
    .from('pharmacies')
    .select('name, avg_response_time, response_rate, availability_rate, global_score')
    .eq('is_active', true)
    .not('global_score', 'is', null)
    .order('global_score', { ascending: false })
    .limit(8)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Statistiques des 7 derniers jours</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Demandes aujourd'hui"
          value={todayCount.count ?? 0}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          label="Demandes (7j)"
          value={weekCount.count ?? 0}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Taux de succès"
          value={`${successRate}%`}
          sub="demandes avec résultat"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="En cours"
          value={pendingCount.count ?? 0}
          icon={AlertCircle}
          color="yellow"
        />
        <StatCard
          label="Pharmacies actives"
          value={activePharm.count ?? 0}
          icon={Building2}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top médicaments */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Médicaments les plus recherchés</h2>
            <p className="text-xs text-gray-400">7 derniers jours</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {topMeds.length === 0 && (
              <p className="text-sm text-gray-400">Aucune donnée</p>
            )}
            {topMeds.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize">{m.name_raw}</span>
                    <span className="text-sm font-semibold text-gray-900">{m.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(m.count / (topMeds[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top pharmacies */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Pharmacies les plus performantes</h2>
          </CardHeader>
          <CardContent>
            {!topPharm?.length && (
              <p className="text-sm text-gray-400">Aucune donnée</p>
            )}
            <div className="space-y-3">
              {topPharm?.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.availability_rate != null ? `${p.availability_rate}% dispo` : ''}{' '}
                      {p.avg_response_time != null ? `· ${Math.round(p.avg_response_time / 60)}min` : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${
                    (p.global_score ?? 0) >= 70 ? 'text-green-600' :
                    (p.global_score ?? 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {p.global_score ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

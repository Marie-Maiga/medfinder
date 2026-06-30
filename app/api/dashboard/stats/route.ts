import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [todayResult, weekResult, pendingResult, pharmaciesResult, successResult] =
    await Promise.all([
      supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),

      supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString()),

      supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'sent', 'partial']),

      supabase
        .from('pharmacies')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      supabase
        .from('requests')
        .select('id, created_at, result_sent_at')
        .eq('status', 'completed')
        .gte('created_at', weekAgo.toISOString()),
    ])

  const completedRequests = successResult.data ?? []
  const totalWeek = weekResult.count ?? 0

  const avgProcessingTimeSec = completedRequests.length
    ? Math.round(
        completedRequests.reduce((sum, r) => {
          if (!r.result_sent_at) return sum
          return sum + (new Date(r.result_sent_at).getTime() - new Date(r.created_at).getTime()) / 1000
        }, 0) / completedRequests.length
      )
    : 0

  return NextResponse.json({
    data: {
      total_requests_today: todayResult.count ?? 0,
      total_requests_week: totalWeek,
      success_rate: totalWeek > 0
        ? Math.round((completedRequests.length / totalWeek) * 100)
        : 0,
      avg_processing_time_sec: avgProcessingTimeSec,
      active_pharmacies: pharmaciesResult.count ?? 0,
      pending_requests: pendingResult.count ?? 0,
    },
  })
}

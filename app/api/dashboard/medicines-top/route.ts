import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days') ?? '30', 10)
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10)

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('request_medicines')
    .select('name_raw, request:requests!inner(created_at)')
    .gte('request.created_at', since.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count occurrences client-side (simple aggregation)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const key = row.name_raw.toLowerCase().trim()
    counts[key] = (counts[key] ?? 0) + 1
  }

  const sorted = Object.entries(counts)
    .map(([name_raw, count]) => ({ name_raw, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return NextResponse.json({ data: sorted })
}

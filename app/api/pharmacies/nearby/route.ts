import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? '')
  const lng = parseFloat(url.searchParams.get('lng') ?? '')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 20)
  const maxMeters = url.searchParams.get('max_meters')
    ? parseInt(url.searchParams.get('max_meters')!, 10)
    : null

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('get_nearby_pharmacies', {
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
    p_max_meters: maxMeters,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

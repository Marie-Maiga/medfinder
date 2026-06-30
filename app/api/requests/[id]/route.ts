import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      operator:user_profiles(full_name, role),
      patient_neighborhood:neighborhoods(name, centroid_lat, centroid_lng),
      request_medicines(id, name_raw, medicine:medicines(name, aliases)),
      request_pharmacies(
        *,
        pharmacy:pharmacies(id, name, whatsapp_phone, address, lat, lng, neighborhood:neighborhoods(name))
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ data })
}

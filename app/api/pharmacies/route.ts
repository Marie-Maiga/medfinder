import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/utils/phone'

const PharmacySchema = z.object({
  name: z.string().min(2),
  whatsapp_phone: z.string().min(8),
  neighborhood_id: z.string().uuid().optional(),
  address: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  is_active: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const activeOnly = url.searchParams.get('active') !== 'false'

  let query = supabase
    .from('pharmacies')
    .select('*, neighborhood:neighborhoods(name)')
    .order('name')

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = PharmacySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('pharmacies')
    .insert({ ...parsed.data, whatsapp_phone: normalizePhone(parsed.data.whatsapp_phone) })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await serviceClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'pharmacy.created',
    entity_type: 'pharmacy',
    entity_id: data.id,
    new_value: data,
  })

  return NextResponse.json({ data }, { status: 201 })
}

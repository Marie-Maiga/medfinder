import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const SettingsSchema = z.object({
  response_timeout_sec:       z.number().int().min(60).max(3600).optional(),
  max_pharmacies_per_request: z.number().int().min(1).max(20).optional(),
  whatsapp_bot_phone:         z.string().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('app_settings')
    .select('response_timeout_sec, max_pharmacies_per_request, whatsapp_bot_phone, updated_at')
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = SettingsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await serviceClient
    .from('app_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', 1)
    .select('response_timeout_sec, max_pharmacies_per_request, whatsapp_bot_phone, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await serviceClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'settings.updated',
    entity_type: 'app_settings',
    entity_id: null,
    new_value: data,
  })

  return NextResponse.json({ data })
}

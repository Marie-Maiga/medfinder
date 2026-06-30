import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { scorePharmacies } from '@/lib/scoring/pharmacy-scorer'
import { sendPharmacyRequest } from '@/lib/whatsapp/client'
import { normalizePhone } from '@/lib/utils/phone'
import { NIAMEY_CENTER } from '@/lib/geo/neighborhoods'

const TIMEOUT_MINUTES = parseInt(process.env.REQUEST_TIMEOUT_MINUTES ?? '15', 10)

const CreateRequestSchema = z.object({
  patient_name: z.string().optional(),
  patient_phone: z.string().min(8),
  patient_neighborhood_id: z.string().uuid(),
  patient_lat: z.number().optional(),
  patient_lng: z.number().optional(),
  medicines: z.array(z.string().min(1)).min(1).max(10),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const status = url.searchParams.get('status')
  const from = (page - 1) * limit

  let query = supabase
    .from('requests')
    .select(`
      *,
      operator:user_profiles(full_name),
      patient_neighborhood:neighborhoods(name),
      request_medicines(id, name_raw),
      request_pharmacies(id, response_status, distance_meters, pharmacy:pharmacies(name))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (profile?.role !== 'admin') {
    query = query.eq('operator_id', user.id)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const {
    patient_name,
    patient_phone,
    patient_neighborhood_id,
    patient_lat,
    patient_lng,
    medicines,
    notes,
  } = parsed.data

  // Résolution position effective
  const { data: neighborhood } = await supabase
    .from('neighborhoods')
    .select('centroid_lat, centroid_lng')
    .eq('id', patient_neighborhood_id)
    .single()

  const effective_lat = patient_lat ?? neighborhood?.centroid_lat ?? NIAMEY_CENTER.lat
  const effective_lng = patient_lng ?? neighborhood?.centroid_lng ?? NIAMEY_CENTER.lng

  // Créer la demande
  const { data: req, error: reqErr } = await serviceClient
    .from('requests')
    .insert({
      operator_id: user.id,
      patient_name: patient_name || null,
      patient_phone: normalizePhone(patient_phone),
      patient_neighborhood_id,
      patient_lat: patient_lat ?? null,
      patient_lng: patient_lng ?? null,
      effective_lat,
      effective_lng,
      notes: notes || null,
      status: 'pending',
      timeout_at: new Date(Date.now() + TIMEOUT_MINUTES * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (reqErr || !req) {
    return NextResponse.json({ error: reqErr?.message ?? 'Failed to create request' }, { status: 500 })
  }

  // Insérer les médicaments
  await serviceClient.from('request_medicines').insert(
    medicines.map((name_raw) => ({ request_id: req.id, name_raw: name_raw.trim() }))
  )

  // Audit log
  await serviceClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'request.created',
    entity_type: 'request',
    entity_id: req.id,
    new_value: { patient_phone: normalizePhone(patient_phone), medicines },
  })

  // Sélection et contact des pharmacies (asynchrone, sans bloquer la réponse)
  void dispatchPharmacies(req.id, effective_lat, effective_lng, medicines, serviceClient)

  return NextResponse.json({ data: req }, { status: 201 })
}

async function dispatchPharmacies(
  requestId: string,
  lat: number,
  lng: number,
  medicines: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any
) {
  try {
    // Lire les settings depuis la DB
    const { data: settings } = await serviceClient
      .from('app_settings')
      .select('response_timeout_sec, max_pharmacies_per_request')
      .eq('id', 1)
      .single()
    const maxPharmacies = settings?.max_pharmacies_per_request ?? 5

    // Récupérer pharmacies actives
    const { data: pharmacies } = await serviceClient
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)

    if (!pharmacies?.length) {
      await serviceClient
        .from('requests')
        .update({ status: 'failed' })
        .eq('id', requestId)
      return
    }

    // Récupérer le quartier patient pour le message
    const { data: req } = await serviceClient
      .from('requests')
      .select('patient_neighborhood:neighborhoods(name)')
      .eq('id', requestId)
      .single()

    const neighborhoodName = req?.patient_neighborhood?.name ?? 'Niamey'

    // Scorer et sélectionner
    const selected = scorePharmacies(pharmacies, lat, lng, maxPharmacies)

    // Insérer les request_pharmacies
    const { data: rphList } = await serviceClient
      .from('request_pharmacies')
      .insert(
        selected.map((p, i) => ({
          request_id: requestId,
          pharmacy_id: p.id,
          distance_meters: p.distance_meters,
          rank: i + 1,
        }))
      )
      .select()

    // Mettre à jour statut → sent
    await serviceClient
      .from('requests')
      .update({ status: 'sent', pharmacies_contacted: selected.length })
      .eq('id', requestId)

    // Envoyer WhatsApp à chaque pharmacie
    for (const rph of rphList ?? []) {
      const pharmacy = selected.find((p) => p.id === rph.pharmacy_id)
      if (!pharmacy) continue

      try {
        const result = await sendPharmacyRequest(
          pharmacy.whatsapp_phone,
          pharmacy.name,
          medicines,
          neighborhoodName,
          rph.id
        )

        await serviceClient
          .from('request_pharmacies')
          .update({ sent_at: new Date().toISOString(), whatsapp_msg_id: result.messages[0]?.id })
          .eq('id', rph.id)

        await serviceClient.from('whatsapp_messages').insert({
          direction: 'outbound',
          from_phone: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
          to_phone: pharmacy.whatsapp_phone,
          wa_message_id: result.messages[0]?.id,
          message_type: 'interactive',
          body_preview: `Demande médicaments: ${medicines.join(', ')}`.slice(0, 500),
          status: 'sent',
          request_id: requestId,
          pharmacy_id: pharmacy.id,
          raw_payload: result as unknown as Record<string, unknown>,
        })
      } catch (err) {
        console.error(`Failed to send WhatsApp to ${pharmacy.name}:`, err)
        await serviceClient
          .from('request_pharmacies')
          .update({ response_status: 'error' })
          .eq('id', rph.id)
      }
    }
  } catch (err) {
    console.error('dispatchPharmacies error:', err)
  }
}

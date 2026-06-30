import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, parseWebhookMessage } from '@/lib/whatsapp/webhook'
import { sendPatientResults } from '@/lib/whatsapp/client'

// GET — Meta webhook verification challenge
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// POST — incoming messages from WhatsApp
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const parsed = parseWebhookMessage(payload)

  // Always acknowledge quickly — Meta expects 200 within 20s
  if (!parsed) return new Response('OK', { status: 200 })

  const serviceClient = createServiceClient()

  if (parsed.type === 'button_reply') {
    await handlePharmacyReply(parsed, serviceClient)
  } else if (parsed.type === 'feedback') {
    await handlePatientFeedback(parsed, serviceClient)
  } else if (parsed.type === 'text') {
    await handleTextReply(parsed, serviceClient)
  }

  return new Response('OK', { status: 200 })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePharmacyReply(parsed: any, serviceClient: any) {
  const { requestPharmacyId, isAvailable, fromPhone, waMessageId, timestamp } = parsed

  // Fetch request_pharmacy + related data
  const { data: rph } = await serviceClient
    .from('request_pharmacies')
    .select(`
      *,
      request:requests(*),
      pharmacy:pharmacies(name, address, whatsapp_phone)
    `)
    .eq('id', requestPharmacyId)
    .single()

  if (!rph) return

  const sentAt = rph.sent_at ? new Date(rph.sent_at).getTime() / 1000 : timestamp
  const responseTimeSec = Math.round(timestamp - sentAt)
  const newStatus = isAvailable ? 'available' : 'unavailable'

  // Update request_pharmacy
  await serviceClient
    .from('request_pharmacies')
    .update({
      response_status: newStatus,
      responded_at: new Date(timestamp * 1000).toISOString(),
      response_time_sec: responseTimeSec,
    })
    .eq('id', requestPharmacyId)

  // Log inbound message
  await serviceClient.from('whatsapp_messages').insert({
    direction: 'inbound',
    from_phone: fromPhone,
    to_phone: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    wa_message_id: waMessageId,
    message_type: 'interactive',
    body_preview: isAvailable ? 'Disponible' : 'Indisponible',
    status: 'received',
    request_id: rph.request_id,
    pharmacy_id: rph.pharmacy_id,
    raw_payload: parsed,
  })

  const requestId = rph.request_id
  const request = rph.request

  // Count responses so far
  const { data: allRph } = await serviceClient
    .from('request_pharmacies')
    .select('response_status, distance_meters, pharmacy:pharmacies(name, address, whatsapp_phone)')
    .eq('request_id', requestId)

  const responded = (allRph ?? []).filter(
    (r: { response_status: string }) => r.response_status !== 'pending'
  ).length
  const total = (allRph ?? []).length

  await serviceClient
    .from('requests')
    .update({ pharmacies_responded: responded })
    .eq('id', requestId)

  // Send results if all responded OR timeout passed
  const allDone = responded >= total
  const timedOut = request?.timeout_at && new Date() >= new Date(request.timeout_at)
  const alreadySent = !!request?.result_sent_at

  if (!alreadySent && (allDone || timedOut)) {
    await sendResults(requestId, request, allRph ?? [], serviceClient)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendResults(requestId: string, request: any, allRph: any[], serviceClient: any) {
  // Get medicines for this request
  const { data: medicines } = await serviceClient
    .from('request_medicines')
    .select('name_raw')
    .eq('request_id', requestId)

  const medicineNames = (medicines ?? []).map((m: { name_raw: string }) => m.name_raw)

  const available = allRph
    .filter((r: { response_status: string }) => r.response_status === 'available')
    .sort((a: { distance_meters: number }, b: { distance_meters: number }) => a.distance_meters - b.distance_meters)
    .map((r: { pharmacy: { name: string; address: string | null; whatsapp_phone: string }; distance_meters: number }) => ({
      name: r.pharmacy.name,
      address: r.pharmacy.address,
      distance_meters: r.distance_meters,
      phone: r.pharmacy.whatsapp_phone,
    }))

  try {
    await sendPatientResults(request.patient_phone, medicineNames, available)

    await serviceClient
      .from('requests')
      .update({
        status: available.length > 0 ? 'completed' : 'partial',
        result_sent_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    await serviceClient.from('whatsapp_messages').insert({
      direction: 'outbound',
      from_phone: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
      to_phone: request.patient_phone,
      message_type: 'text',
      body_preview: `Résultats envoyés: ${available.length} pharmacie(s) disponible(s)`,
      status: 'sent',
      request_id: requestId,
    })
  } catch (err) {
    console.error('Failed to send patient results:', err)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTextReply(parsed: any, serviceClient: any) {
  const { text, fromPhone, waMessageId, timestamp } = parsed
  const upper = text.toUpperCase().trim()

  // Check if it looks like a pharmacy availability reply
  const isAvailable =
    upper === 'DISPO' ||
    upper === 'DISPONIBLE' ||
    upper === 'OUI' ||
    upper === '1' ||
    upper === 'YES'
  const isUnavailable =
    upper === 'INDISPONIBLE' ||
    upper === 'INDISPO' ||
    upper === 'NON' ||
    upper === 'PAS DISPO' ||
    upper === '0' ||
    upper === 'NO'

  if (!isAvailable && !isUnavailable) return

  // Find pharmacy by phone number
  const { data: pharmacy } = await serviceClient
    .from('pharmacies')
    .select('id')
    .eq('whatsapp_phone', fromPhone)
    .maybeSingle()

  if (!pharmacy) return

  // Find most recent pending request_pharmacy for this pharmacy
  const { data: rph } = await serviceClient
    .from('request_pharmacies')
    .select(`*, request:requests(*), pharmacy:pharmacies(name, address, whatsapp_phone)`)
    .eq('pharmacy_id', pharmacy.id)
    .eq('response_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!rph) return

  // Reuse handlePharmacyReply logic
  await handlePharmacyReply(
    {
      type: 'button_reply',
      requestPharmacyId: rph.id,
      isAvailable,
      fromPhone,
      waMessageId,
      timestamp,
    },
    serviceClient
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePatientFeedback(parsed: any, serviceClient: any) {
  const { isFound, fromPhone, waMessageId } = parsed

  // Find request by patient phone
  const { data: req } = await serviceClient
    .from('requests')
    .select('id')
    .eq('patient_phone', fromPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!req) return

  await serviceClient
    .from('requests')
    .update({ patient_feedback: isFound ? 'found' : 'not_found' })
    .eq('id', req.id)

  await serviceClient.from('whatsapp_messages').insert({
    direction: 'inbound',
    from_phone: fromPhone,
    to_phone: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    wa_message_id: waMessageId,
    message_type: 'interactive',
    body_preview: isFound ? 'Feedback: trouvé' : 'Feedback: non trouvé',
    status: 'received',
    request_id: req.id,
  })
}

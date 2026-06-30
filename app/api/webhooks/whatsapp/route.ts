import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, parseWebhookMessage } from '@/lib/whatsapp/webhook'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPatientResults, sendPatientFeedbackRequest } from '@/lib/whatsapp/client'

// WhatsApp webhook verification
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  // Always respond 200 immediately to WhatsApp (< 3s requirement)
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ status: 'ok' })
  }

  // Process asynchronously
  void processWebhook(payload)

  return NextResponse.json({ status: 'ok' })
}

async function processWebhook(payload: unknown) {
  const serviceClient = await createServiceClient()

  const message = parseWebhookMessage(payload)
  if (!message) return

  // Log incoming message
  await serviceClient.from('whatsapp_messages').upsert({
    direction: 'inbound',
    from_phone: message.fromPhone,
    to_phone: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    wa_message_id: message.waMessageId,
    message_type: message.type === 'button_reply' ? 'interactive' : 'text',
    body_preview: JSON.stringify(message).slice(0, 500),
    raw_payload: payload as Record<string, unknown>,
  }, { onConflict: 'wa_message_id', ignoreDuplicates: true })

  if (message.type === 'button_reply') {
    await handlePharmacyResponse(message.requestPharmacyId, message.isAvailable, message.fromPhone, serviceClient)
  }

  if (message.type === 'feedback') {
    await handlePatientFeedback(message.fromPhone, message.isFound, serviceClient)
  }
}

async function handlePharmacyResponse(
  requestPharmacyId: string,
  isAvailable: boolean,
  fromPhone: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any
) {
  // Get request_pharmacy with full context
  const { data: rph } = await serviceClient
    .from('request_pharmacies')
    .select(`
      *,
      request:requests(*,
        request_medicines(name_raw),
        patient_neighborhood:neighborhoods(name)
      ),
      pharmacy:pharmacies(id, name, whatsapp_phone, address, lat, lng)
    `)
    .eq('id', requestPharmacyId)
    .single()

  if (!rph || rph.response_status !== 'pending') return

  const now = new Date().toISOString()
  const responseTimeSec = rph.sent_at
    ? Math.round((Date.now() - new Date(rph.sent_at).getTime()) / 1000)
    : null

  // Update response
  await serviceClient
    .from('request_pharmacies')
    .update({
      response_status: isAvailable ? 'available' : 'unavailable',
      responded_at: now,
      response_time_sec: responseTimeSec,
    })
    .eq('id', requestPharmacyId)

  const req = rph.request

  // Update request counters
  const { data: allRph } = await serviceClient
    .from('request_pharmacies')
    .select('response_status')
    .eq('request_id', req.id)

  const responded = (allRph ?? []).filter(
    (r: { response_status: string }) => r.response_status !== 'pending'
  ).length
  const available = (allRph ?? []).filter(
    (r: { response_status: string }) => r.response_status === 'available'
  ).length

  const allAnswered = responded >= req.pharmacies_contacted
  const timeoutReached = req.timeout_at && new Date() >= new Date(req.timeout_at)

  await serviceClient
    .from('requests')
    .update({
      pharmacies_responded: responded,
      status: responded > 0 ? 'partial' : 'sent',
    })
    .eq('id', req.id)

  // Recalculate pharmacy score async
  void serviceClient.rpc('recalculate_pharmacy_scores', { p_pharmacy_id: rph.pharmacy_id })

  // Send results to patient if all answered or timeout
  if (allAnswered || timeoutReached) {
    await sendResultsToPatient(req, allRph ?? [], serviceClient)
  }
}

async function sendResultsToPatient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allRph: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any
) {
  if (req.result_sent_at) return // idempotent

  const availableRph = allRph
    .filter((r) => r.response_status === 'available')
    .sort((a, b) => (a.response_time_sec ?? 999) - (b.response_time_sec ?? 999))

  // Fetch pharmacy details for available ones
  const { data: pharmacyDetails } = availableRph.length
    ? await serviceClient
        .from('request_pharmacies')
        .select('distance_meters, response_time_sec, pharmacy:pharmacies(name, address, whatsapp_phone, lat, lng)')
        .in('id', availableRph.map((r) => r.id))
    : { data: [] }

  const medicines = req.request_medicines?.map((m: { name_raw: string }) => m.name_raw) ?? []

  const pharmaciesForMessage = (pharmacyDetails ?? []).map((rph: {
    distance_meters: number
    pharmacy: { name: string; address: string | null; whatsapp_phone: string; lat: number; lng: number }
  }) => ({
    name: rph.pharmacy.name,
    address: rph.pharmacy.address,
    distance_meters: rph.distance_meters,
    phone: rph.pharmacy.whatsapp_phone,
  }))

  try {
    await sendPatientResults(req.patient_phone, medicines, pharmaciesForMessage)

    await serviceClient
      .from('requests')
      .update({
        status: pharmaciesForMessage.length > 0 ? 'completed' : 'failed',
        result_sent_at: new Date().toISOString(),
      })
      .eq('id', req.id)

    // Schedule feedback message (2h delay — handled by n8n or a cron)
    await serviceClient.from('audit_logs').insert({
      action: 'request.results_sent',
      entity_type: 'request',
      entity_id: req.id,
      new_value: { available_count: pharmaciesForMessage.length },
    })
  } catch (err) {
    console.error('Failed to send patient results:', err)
  }
}

async function handlePatientFeedback(
  fromPhone: string,
  isFound: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any
) {
  // Find the most recent completed request for this patient phone
  const { data: req } = await serviceClient
    .from('requests')
    .select('id, patient_feedback')
    .eq('patient_phone', fromPhone)
    .in('status', ['completed', 'failed'])
    .is('patient_feedback', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!req) return

  await serviceClient
    .from('requests')
    .update({ patient_feedback: isFound ? 'found' : 'not_found' })
    .eq('id', req.id)
}

// Called by n8n webhook for feedback scheduling
export async function sendFeedbackToPatient(requestId: string) {
  const serviceClient = await createServiceClient()

  const { data: req } = await serviceClient
    .from('requests')
    .select('patient_phone, feedback_sent_at')
    .eq('id', requestId)
    .single()

  if (!req || req.feedback_sent_at) return

  await sendPatientFeedbackRequest(req.patient_phone)
  await serviceClient
    .from('requests')
    .update({ feedback_sent_at: new Date().toISOString() })
    .eq('id', requestId)
}

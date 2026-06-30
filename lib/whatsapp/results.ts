import { sendPatientResults } from '@/lib/whatsapp/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendResults(requestId: string, request: any, allRph: any[], serviceClient: any) {
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

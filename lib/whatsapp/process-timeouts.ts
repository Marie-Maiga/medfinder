import { sendResults } from '@/lib/whatsapp/results'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processTimedOutRequests(serviceClient: any): Promise<number> {
  const { data: timedOutRequests } = await serviceClient
    .from('requests')
    .select('*')
    .in('status', ['pending', 'sent'])
    .lt('timeout_at', new Date().toISOString())
    .is('result_sent_at', null)

  let processed = 0

  for (const req of timedOutRequests ?? []) {
    const { data: allRph } = await serviceClient
      .from('request_pharmacies')
      .select('pharmacy_id, response_status, distance_meters, pharmacy:pharmacies(name, address, whatsapp_phone)')
      .eq('request_id', req.id)

    await sendResults(req.id, req, allRph ?? [], serviceClient)

    // Recalculer les scores de toutes les pharmacies contactées
    const pharmacyIds = (allRph ?? []).map((r: any) => r.pharmacy_id).filter(Boolean)
    for (const pid of pharmacyIds) {
      void serviceClient.rpc('recalculate_pharmacy_scores', { p_pharmacy_id: pid })
    }

    processed++
  }

  return processed
}

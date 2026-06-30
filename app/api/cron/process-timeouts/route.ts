import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendResults } from '@/lib/whatsapp/results'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const serviceClient = createServiceClient()

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
      .select('response_status, distance_meters, pharmacy:pharmacies(name, address, whatsapp_phone)')
      .eq('request_id', req.id)

    await sendResults(req.id, req, allRph ?? [], serviceClient)
    processed++
  }

  return NextResponse.json({ processed })
}

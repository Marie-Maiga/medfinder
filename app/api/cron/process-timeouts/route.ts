import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { processTimedOutRequests } from '@/lib/whatsapp/process-timeouts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const serviceClient = createServiceClient()
  const processed = await processTimedOutRequests(serviceClient)

  return NextResponse.json({ processed })
}

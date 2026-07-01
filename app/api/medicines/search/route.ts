import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json({ data: [] })

  const supabase = await createClient()

  // Recherche sur le nom uniquement (simple et fiable)
  const { data, error } = await supabase
    .from('medicines')
    .select('id, name, synonyms')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(8)

  if (error) {
    console.error('[medicines/search] error:', error)
    return NextResponse.json({ data: [] })
  }

  return NextResponse.json({ data: data ?? [] })
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json({ data: [] })

  const supabase = await createClient()

  // Recherche sur le nom et les synonymes
  const { data, error } = await supabase
    .from('medicines')
    .select('id, name, synonyms')
    .or(`name.ilike.%${q}%,synonyms.cs.{${q}}`)
    .order('name')
    .limit(8)

  if (error) {
    // Fallback : recherche nom uniquement si le filtre synonymes échoue
    const { data: fallback } = await supabase
      .from('medicines')
      .select('id, name, synonyms')
      .ilike('name', `%${q}%`)
      .order('name')
      .limit(8)

    return NextResponse.json({ data: fallback ?? [] })
  }

  return NextResponse.json({ data: data ?? [] })
}

import { createClient } from '@/lib/supabase/server'
import { PharmacyForm } from '@/components/pharmacies/PharmacyForm'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PharmacyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: pharmacy } = await supabase
    .from('pharmacies')
    .select('*, neighborhood:neighborhoods(id, name)')
    .eq('id', id)
    .single()

  if (!pharmacy) notFound()

  const { count: totalRequests } = await supabase
    .from('request_pharmacies')
    .select('id', { count: 'exact', head: true })
    .eq('pharmacy_id', id)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/pharmacies"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{pharmacy.name}</h1>
          <p className="text-sm text-gray-500">{pharmacy.whatsapp_phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase">Demandes</p>
            <p className="text-lg font-bold text-gray-900">{totalRequests ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase">Réactivité</p>
            <p className="text-lg font-bold text-gray-900">
              {pharmacy.avg_response_time != null ? `${Math.round(pharmacy.avg_response_time / 60)}min` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase">Disponibilité</p>
            <p className="text-lg font-bold text-gray-900">
              {pharmacy.availability_rate != null ? `${pharmacy.availability_rate}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase">Score</p>
            <p className="text-lg font-bold text-gray-900">
              {pharmacy.global_score != null ? pharmacy.global_score : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <PharmacyForm pharmacy={pharmacy} />
    </div>
  )
}

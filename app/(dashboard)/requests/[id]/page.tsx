import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PharmacyResponseTracker } from '@/components/requests/PharmacyResponseTracker'
import { RequestStatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, User, Phone, MapPin, Pill } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Request } from '@/types'

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      operator:user_profiles(full_name),
      patient_neighborhood:neighborhoods(name),
      request_medicines(id, name_raw),
      request_pharmacies(
        *,
        pharmacy:pharmacies(id, name, whatsapp_phone, address, lat, lng)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const req = data as unknown as Request

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/requests"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Demande</h1>
            <RequestStatusBadge status={req.status} />
          </div>
          <p className="text-sm text-gray-400">
            {format(new Date(req.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            {' · '}par {req.operator?.full_name}
          </p>
        </div>
      </div>

      {/* Patient info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Patient</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {req.patient_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span>{req.patient_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="font-mono">{req.patient_phone}</span>
          </div>
          {req.patient_neighborhood && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{(req.patient_neighborhood as any).name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Médicaments */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Médicaments demandés</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {req.request_medicines?.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg text-sm"
              >
                <Pill className="h-3.5 w-3.5" />
                {m.name_raw}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suivi temps réel */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Réponses des pharmacies</h2>
        </CardHeader>
        <CardContent>
          <PharmacyResponseTracker
            requestId={req.id}
            initialPharmacies={req.request_pharmacies ?? []}
            timeoutAt={req.timeout_at}
          />
        </CardContent>
      </Card>

      {/* Résultats */}
      {req.result_sent_at && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-green-700">
              ✅ Résultats envoyés au patient le{' '}
              {format(new Date(req.result_sent_at), "d MMM 'à' HH:mm", { locale: fr })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {req.patient_feedback && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm">
              {req.patient_feedback === 'found'
                ? '✅ Patient a confirmé avoir trouvé ses médicaments'
                : '❌ Patient n\'a pas trouvé ses médicaments'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { RequestStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', userId!).single()

  let query = supabase
    .from('requests')
    .select(`
      id, status, patient_name, patient_phone, created_at,
      pharmacies_contacted, pharmacies_responded,
      patient_neighborhood:neighborhoods(name),
      request_medicines(name_raw)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (profile?.role !== 'admin') {
    query = query.eq('operator_id', userId!)
  }

  const { data: requests } = await query

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Demandes</h1>
          <p className="text-sm text-gray-500">{requests?.length ?? 0} demande(s)</p>
        </div>
        <Link href="/requests/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      {!requests?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Aucune demande</p>
          <p className="text-gray-400 text-sm mt-1">Créez votre première demande</p>
          <Link href="/requests/new" className="mt-4">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nouvelle demande
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médicaments</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quartier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacies</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests!.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/requests/${req.id}`} className="hover:underline font-medium text-gray-900">
                      {req.patient_name ?? req.patient_phone}
                    </Link>
                    {req.patient_name && (
                      <p className="text-xs text-gray-400 font-mono">{req.patient_phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-600">
                      {(req.request_medicines as any[])?.map((m: any) => m.name_raw).join(', ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(req.patient_neighborhood as any)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {req.pharmacies_responded}/{req.pharmacies_contacted}
                  </td>
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {format(new Date(req.created_at), "d MMM HH:mm", { locale: fr })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

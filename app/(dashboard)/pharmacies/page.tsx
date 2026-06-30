import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Building2 } from 'lucide-react'

export default async function PharmaciesPage() {
  const supabase = await createClient()

  const { data: pharmacies } = await supabase
    .from('pharmacies')
    .select('*, neighborhood:neighborhoods(name)')
    .order('name')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pharmacies</h1>
          <p className="text-sm text-gray-500">{pharmacies?.length ?? 0} pharmacie(s)</p>
        </div>
        <Link href="/pharmacies/new">
          <Button>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </Link>
      </div>

      {!pharmacies?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Aucune pharmacie enregistrée</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quartier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réactivité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponibilité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pharmacies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/pharmacies/${p.id}`} className="font-medium text-gray-900 hover:underline">
                      {p.name}
                    </Link>
                    {p.address && <p className="text-xs text-gray-400">{p.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(p.neighborhood as any)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.whatsapp_phone}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.avg_response_time != null
                      ? `${Math.round(p.avg_response_time / 60)}min`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.availability_rate != null ? `${p.availability_rate}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.global_score != null ? (
                      <span className={`font-bold text-sm ${p.global_score >= 70 ? 'text-green-600' : p.global_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {p.global_score}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_active ? 'success' : 'muted'}>
                      {p.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
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

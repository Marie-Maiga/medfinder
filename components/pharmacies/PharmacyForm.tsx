'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Neighborhood, Pharmacy } from '@/types'
import { NIAMEY_CENTER } from '@/lib/geo/neighborhoods'

const LocationPicker = dynamic(
  () => import('./LocationPicker').then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-[280px] bg-gray-100 rounded-lg animate-pulse" /> }
)

interface PharmacyFormProps {
  pharmacy?: Pharmacy
}

export function PharmacyForm({ pharmacy }: PharmacyFormProps) {
  const router = useRouter()
  const isEdit = !!pharmacy
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])

  const [form, setForm] = useState({
    name: pharmacy?.name ?? '',
    whatsapp_phone: pharmacy?.whatsapp_phone ?? '',
    neighborhood_id: pharmacy?.neighborhood_id ?? '',
    address: pharmacy?.address ?? '',
    lat: pharmacy?.lat ?? NIAMEY_CENTER.lat,
    lng: pharmacy?.lng ?? NIAMEY_CENTER.lng,
    is_active: pharmacy?.is_active ?? true,
  })

  useEffect(() => {
    fetch('/api/neighborhoods')
      .then((r) => r.json())
      .then((d) => setNeighborhoods(d.data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      ...form,
      neighborhood_id: form.neighborhood_id || undefined,
      address: form.address || undefined,
    }

    const res = await fetch(
      isEdit ? `/api/pharmacies/${pharmacy.id}` : '/api/pharmacies',
      {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Erreur lors de l\'enregistrement')
      setLoading(false)
      return
    }

    router.push(`/pharmacies/${data.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Informations</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la pharmacie <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Pharmacie du Plateau"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                  +227
                </span>
                <input
                  type="tel"
                  required
                  value={form.whatsapp_phone}
                  onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="90 00 00 00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quartier
              </label>
              <select
                value={form.neighborhood_id}
                onChange={(e) => setForm({ ...form, neighborhood_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sélectionner...</option>
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rue, repère..."
            />
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              Pharmacie active (reçoit des demandes)
            </label>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Localisation</h2>
          <p className="text-xs text-gray-400 mt-0.5">Cliquez sur la carte pour positionner la pharmacie</p>
        </CardHeader>
        <CardContent>
          <LocationPicker
            lat={form.lat}
            lng={form.lng}
            onChange={(lat, lng) => setForm({ ...form, lat, lng })}
          />
          <div className="grid grid-cols-2 gap-4 mt-3 text-xs text-gray-500">
            <p>Latitude : {form.lat.toFixed(5)}</p>
            <p>Longitude : {form.lng.toFixed(5)}</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Enregistrer' : 'Créer la pharmacie'}
        </Button>
      </div>
    </form>
  )
}

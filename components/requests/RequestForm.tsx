'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MedicineAutocomplete } from './MedicineAutocomplete'
import type { Neighborhood } from '@/types'

export function RequestForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])

  const [form, setForm] = useState({
    patient_name: '',
    patient_phone: '',
    patient_neighborhood_id: '',
    notes: '',
  })
  const [medicines, setMedicines] = useState<string[]>([''])

  useEffect(() => {
    fetch('/api/neighborhoods')
      .then((r) => r.json())
      .then((d) => setNeighborhoods(d.data ?? []))
  }, [])

  function addMedicine() {
    if (medicines.length < 10) setMedicines([...medicines, ''])
  }

  function removeMedicine(i: number) {
    setMedicines(medicines.filter((_, idx) => idx !== i))
  }

  function updateMedicine(i: number, value: string) {
    const updated = [...medicines]
    updated[i] = value
    setMedicines(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const validMeds = medicines.filter((m) => m.trim().length > 0)
    if (validMeds.length === 0) {
      setError('Ajoutez au moins un médicament')
      return
    }

    setLoading(true)

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        patient_name: form.patient_name || undefined,
        notes: form.notes || undefined,
        medicines: validMeds,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error?.message ?? 'Erreur lors de la création')
      setLoading(false)
      return
    }

    router.push(`/requests/${data.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Informations patient</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.patient_name}
                onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nom du patient"
              />
            </div>

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
                  value={form.patient_phone}
                  onChange={(e) => setForm({ ...form, patient_phone: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="90 00 00 00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quartier <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.patient_neighborhood_id}
              onChange={(e) => setForm({ ...form, patient_neighborhood_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Sélectionner un quartier...</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400">(optionnel)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Informations complémentaires..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Médicaments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Médicaments demandés
            </h2>
            <span className="text-xs text-gray-400">{medicines.filter(m => m.trim()).length} / 10</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {medicines.map((med, i) => (
            <div key={i} className="flex gap-2">
              <MedicineAutocomplete
                value={med}
                onChange={(v) => updateMedicine(i, v)}
                placeholder="Ex : Paracétamol, Augmentin 1g..."
              />
              {medicines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMedicine(i)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {medicines.length < 10 && (
            <button
              type="button"
              onClick={addMedicine}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              Ajouter un médicament
            </button>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button type="submit" loading={loading}>
          <Send className="h-4 w-4" />
          Lancer la recherche
        </Button>
      </div>
    </form>
  )
}

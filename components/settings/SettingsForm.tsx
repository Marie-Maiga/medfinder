'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Users, Phone, CheckCircle } from 'lucide-react'

interface Settings {
  response_timeout_sec: number
  max_pharmacies_per_request: number
  whatsapp_bot_phone: string | null
  updated_at: string | null
}

interface SettingsFormProps {
  settings: Settings | null
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [form, setForm] = useState({
    response_timeout_sec: settings?.response_timeout_sec ?? 900,
    max_pharmacies_per_request: settings?.max_pharmacies_per_request ?? 5,
    whatsapp_bot_phone: settings?.whatsapp_bot_phone ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const timeoutMin = Math.round(form.response_timeout_sec / 60)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        whatsapp_bot_phone: form.whatsapp_bot_phone || null,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Erreur lors de la sauvegarde')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Délai de réponse */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900">Délai de réponse</h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Temps accordé aux pharmacies pour répondre avant d&apos;envoyer les résultats au patient
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Délai</span>
              <span className="text-sm font-semibold text-blue-600 tabular-nums">
                {timeoutMin} min
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={timeoutMin}
              onChange={(e) =>
                setForm({ ...form, response_timeout_sec: Number(e.target.value) * 60 })
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>5 min</span>
              <span>30 min</span>
              <span>60 min</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nombre de pharmacies */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900">Pharmacies contactées</h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Nombre maximum de pharmacies à contacter par demande (les plus proches en priorité)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Maximum</span>
              <span className="text-sm font-semibold text-blue-600 tabular-nums">
                {form.max_pharmacies_per_request} pharmacies
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={form.max_pharmacies_per_request}
              onChange={(e) =>
                setForm({ ...form, max_pharmacies_per_request: Number(e.target.value) })
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1</span>
              <span>8</span>
              <span>15</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900">Numéro WhatsApp du bot</h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Numéro associé à votre compte WhatsApp Business (Meta)
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex">
            <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
              +227
            </span>
            <input
              type="tel"
              value={form.whatsapp_bot_phone.replace(/^\+227/, '')}
              onChange={(e) =>
                setForm({ ...form, whatsapp_bot_phone: e.target.value ? `+227${e.target.value.replace(/^\+227/, '')}` : '' })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="93 04 66 99"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Visible sur lahiya-tech.com : +22793046699
          </p>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Paramètres sauvegardés
          </span>
        )}
        <Button type="submit" loading={loading}>
          Enregistrer
        </Button>
      </div>

      {settings?.updated_at && (
        <p className="text-xs text-gray-400 text-right">
          Dernière modification : {new Date(settings.updated_at).toLocaleString('fr-FR')}
        </p>
      )}
    </form>
  )
}

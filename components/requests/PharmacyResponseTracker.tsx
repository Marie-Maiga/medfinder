'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ResponseStatusBadge, RequestStatusBadge } from '@/components/ui/badge'
import { formatDistance } from '@/lib/geo/distance'
import { Clock, Building2, RefreshCw } from 'lucide-react'
import type { RequestPharmacy } from '@/types'

interface Props {
  requestId: string
  initialPharmacies: RequestPharmacy[]
  timeoutAt: string | null
  initialStatus: string
  initialResultSentAt: string | null
}

export function PharmacyResponseTracker({
  requestId,
  initialPharmacies,
  timeoutAt,
  initialStatus,
  initialResultSentAt,
}: Props) {
  const [pharmacies, setPharmacies] = useState(initialPharmacies)
  const [status, setStatus] = useState(initialStatus)
  const [resultSentAt, setResultSentAt] = useState(initialResultSentAt)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const supabase = createClient()

  // Refetch pharmacy list with joined data
  async function refetchPharmacies() {
    const { data } = await supabase
      .from('request_pharmacies')
      .select('*, pharmacy:pharmacies(id, name, whatsapp_phone, address, lat, lng)')
      .eq('request_id', requestId)
      .order('rank')
    if (data) setPharmacies(data as RequestPharmacy[])
  }

  // Real-time: request_pharmacies (INSERT + UPDATE)
  useEffect(() => {
    const channel = supabase
      .channel(`rph-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'request_pharmacies',
          filter: `request_id=eq.${requestId}`,
        },
        () => { void refetchPharmacies() }
      )
      .subscribe()

    // Initial fetch in case page loaded before dispatch finished
    void refetchPharmacies()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  // Real-time: requests table (status + result_sent_at)
  useEffect(() => {
    const channel = supabase
      .channel(`req-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.new.status) setStatus(payload.new.status)
          if (payload.new.result_sent_at) setResultSentAt(payload.new.result_sent_at)
          if (payload.new.timeout_at) {
            // timeout_at may have been updated
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  // Countdown timer — s'arrête si résultats déjà envoyés ou tout le monde a répondu
  const allResponded = pharmacies.length > 0 && pharmacies.every((p) => p.response_status !== 'pending')
  useEffect(() => {
    if (!timeoutAt || resultSentAt || allResponded) {
      setTimeLeft(null)
      return
    }

    const interval = setInterval(() => {
      const remaining = new Date(timeoutAt).getTime() - Date.now()
      setTimeLeft(remaining > 0 ? remaining : 0)
    }, 1000)

    return () => clearInterval(interval)
  }, [timeoutAt, resultSentAt, allResponded])

  const responded = pharmacies.filter((p) => p.response_status !== 'pending').length
  const available = pharmacies.filter((p) => p.response_status === 'available').length

  function formatTimeLeft(ms: number): string {
    const secs = Math.floor(ms / 1000)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Status badge temps réel */}
      <div className="flex items-center gap-2">
        <RequestStatusBadge status={status} />
        {resultSentAt && (
          <span className="text-xs text-green-600">
            ✅ Résultats envoyés au patient
          </span>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">
            <strong>{responded}/{pharmacies.length}</strong> réponse(s)
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-green-500" />
          <span className="text-gray-600">
            <strong className="text-green-600">{available}</strong> disponible(s)
          </span>
        </div>
        {timeLeft !== null && timeLeft > 0 && (
          <div className="flex items-center gap-2 text-sm ml-auto">
            <Clock className="h-4 w-4 text-orange-400" />
            <span className="text-orange-600 font-mono font-medium">
              {formatTimeLeft(timeLeft)}
            </span>
          </div>
        )}
        {timeLeft === 0 && (
          <span className="text-xs text-gray-400 ml-auto">Délai expiré</span>
        )}
      </div>

      {/* Pharmacy list */}
      <div className="space-y-2">
        {pharmacies.length === 0 && (
          <div className="flex items-center gap-2 p-4 text-sm text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Sélection des pharmacies en cours…
          </div>
        )}
        {pharmacies
          .sort((a, b) => a.rank - b.rank)
          .map((rph) => (
            <div
              key={rph.id}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl"
            >
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                {rph.rank}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(rph.pharmacy as any)?.name ?? '—'}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDistance(rph.distance_meters)}
                  {rph.response_time_sec != null && (
                    <> · répondu en {rph.response_time_sec}s</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {rph.response_status === 'pending' && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-xs text-gray-500">En attente</span>
                  </div>
                )}
                {rph.response_status !== 'pending' && (
                  <ResponseStatusBadge status={rph.response_status} />
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

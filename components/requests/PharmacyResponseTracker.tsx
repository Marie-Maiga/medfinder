'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ResponseStatusBadge } from '@/components/ui/badge'
import { formatDistance } from '@/lib/geo/distance'
import { Clock, Building2, RefreshCw } from 'lucide-react'
import type { RequestPharmacy } from '@/types'

interface Props {
  requestId: string
  initialPharmacies: RequestPharmacy[]
  timeoutAt: string | null
}

export function PharmacyResponseTracker({ requestId, initialPharmacies, timeoutAt }: Props) {
  const [pharmacies, setPharmacies] = useState(initialPharmacies)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const supabase = createClient()

  // Real-time subscription on request_pharmacies
  useEffect(() => {
    const channel = supabase
      .channel(`request-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'request_pharmacies',
          filter: `request_id=eq.${requestId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setPharmacies((prev) =>
            prev.map((p) =>
              p.id === payload.new.id ? { ...p, ...payload.new } : p
            )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [requestId, supabase])

  // Countdown timer
  useEffect(() => {
    if (!timeoutAt) return

    const interval = setInterval(() => {
      const remaining = new Date(timeoutAt).getTime() - Date.now()
      setTimeLeft(remaining > 0 ? remaining : 0)
    }, 1000)

    return () => clearInterval(interval)
  }, [timeoutAt])

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

import type { Pharmacy, PharmacyWithDistance } from '@/types'
import { haversineDistance } from '@/lib/geo/distance'

const MAX_RESPONSE_TIME_SEC = 900 // 15 minutes

export function scorePharmacies(
  pharmacies: Pharmacy[],
  patientLat: number,
  patientLng: number,
  limit = 5
): PharmacyWithDistance[] {
  const withDistances = pharmacies.map((p) => ({
    ...p,
    distance_meters: haversineDistance(patientLat, patientLng, p.lat, p.lng),
    selection_score: 0,
  }))

  const maxDistance = Math.max(...withDistances.map((p) => p.distance_meters), 1)

  const scored = withDistances.map((p) => {
    const proximityScore = 1 - p.distance_meters / maxDistance

    const reactionScore =
      p.avg_response_time != null
        ? Math.max(0, 1 - p.avg_response_time / MAX_RESPONSE_TIME_SEC)
        : 0.5 // neutral for new pharmacies

    const availabilityScore =
      p.availability_rate != null ? p.availability_rate / 100 : 0.5

    const selection_score =
      0.5 * proximityScore + 0.3 * reactionScore + 0.2 * availabilityScore

    return { ...p, selection_score }
  })

  return scored
    .sort((a, b) => b.selection_score - a.selection_score)
    .slice(0, limit)
}

export function rankResults(
  pharmacies: PharmacyWithDistance[]
): PharmacyWithDistance[] {
  return [...pharmacies].sort((a, b) => {
    // Primary: available first
    const statusOrder = { available: 0, partial: 1, pending: 2, unavailable: 3, timeout: 4, error: 5 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aStatus = (a as any).response_status ?? 'pending'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bStatus = (b as any).response_status ?? 'pending'
    const statusDiff =
      (statusOrder[aStatus as keyof typeof statusOrder] ?? 99) -
      (statusOrder[bStatus as keyof typeof statusOrder] ?? 99)
    if (statusDiff !== 0) return statusDiff

    // Secondary: fastest response
    const aTime = (a as any).response_time_sec ?? Infinity
    const bTime = (b as any).response_time_sec ?? Infinity
    if (aTime !== bTime) return aTime - bTime

    // Tertiary: closest
    return a.distance_meters - b.distance_meters
  })
}

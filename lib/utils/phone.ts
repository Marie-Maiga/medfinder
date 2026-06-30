// Normalize to E.164 format for Niger (+227)
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('227') && digits.length === 11) {
    return `+${digits}`
  }
  if (digits.length === 8) {
    return `+227${digits}`
  }
  if (digits.startsWith('00227')) {
    return `+${digits.slice(2)}`
  }
  return `+${digits}`
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone
  return phone.slice(0, 5) + '****' + phone.slice(-2)
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = phone.startsWith('+') ? phone : `+${phone}`
  // +22790123456 → +227 90 12 34 56
  if (normalized.startsWith('+227') && normalized.length === 12) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 6)} ${normalized.slice(6, 8)} ${normalized.slice(8, 10)} ${normalized.slice(10)}`
  }
  return normalized
}

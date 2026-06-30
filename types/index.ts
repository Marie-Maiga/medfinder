export type UserRole = 'admin' | 'operator'

export type RequestStatus =
  | 'pending'
  | 'sent'
  | 'partial'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type PharmacyResponseStatus =
  | 'pending'
  | 'available'
  | 'unavailable'
  | 'timeout'
  | 'error'

export type MedicineAvailability = 'available' | 'unavailable' | 'unknown'

export type MessageDirection = 'outbound' | 'inbound'

export interface Neighborhood {
  id: string
  name: string
  city: string
  centroid_lat: number
  centroid_lng: number
  created_at: string
}

export interface Pharmacy {
  id: string
  name: string
  whatsapp_phone: string
  neighborhood_id: string | null
  address: string | null
  lat: number
  lng: number
  is_active: boolean
  avg_response_time: number | null
  response_rate: number | null
  availability_rate: number | null
  global_score: number | null
  created_at: string
  updated_at: string
  neighborhood?: Neighborhood
}

export interface Medicine {
  id: string
  name: string
  aliases: string[]
  created_at: string
}

export interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Request {
  id: string
  operator_id: string
  patient_name: string | null
  patient_phone: string
  patient_neighborhood_id: string | null
  patient_lat: number | null
  patient_lng: number | null
  effective_lat: number
  effective_lng: number
  status: RequestStatus
  pharmacies_contacted: number
  pharmacies_responded: number
  timeout_at: string | null
  result_sent_at: string | null
  feedback_sent_at: string | null
  patient_feedback: 'found' | 'not_found' | null
  notes: string | null
  created_at: string
  updated_at: string
  operator?: UserProfile
  patient_neighborhood?: Neighborhood
  request_medicines?: RequestMedicine[]
  request_pharmacies?: RequestPharmacy[]
}

export interface RequestMedicine {
  id: string
  request_id: string
  medicine_id: string | null
  name_raw: string
  created_at: string
  medicine?: Medicine
}

export interface RequestPharmacy {
  id: string
  request_id: string
  pharmacy_id: string
  distance_meters: number
  rank: number
  whatsapp_msg_id: string | null
  sent_at: string | null
  response_status: PharmacyResponseStatus
  responded_at: string | null
  response_time_sec: number | null
  pharmacy_note: string | null
  pharmacy?: Pharmacy
  request_pharmacy_medicines?: RequestPharmacyMedicine[]
}

export interface RequestPharmacyMedicine {
  id: string
  request_pharmacy_id: string
  request_medicine_id: string
  availability: MedicineAvailability
}

export interface WhatsAppMessage {
  id: string
  direction: MessageDirection
  from_phone: string
  to_phone: string
  wa_message_id: string | null
  message_type: string | null
  template_name: string | null
  body_preview: string | null
  status: string | null
  request_id: string | null
  pharmacy_id: string | null
  raw_payload: Record<string, unknown>
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// Dashboard types
export interface DashboardStats {
  total_requests_today: number
  total_requests_week: number
  success_rate: number
  avg_processing_time_sec: number
  active_pharmacies: number
  pending_requests: number
}

export interface RequestsByDay {
  date: string
  count: number
  success_count: number
}

export interface TopMedicine {
  name_raw: string
  count: number
}

export interface PharmacyPerformance {
  id: string
  name: string
  avg_response_time: number | null
  response_rate: number | null
  availability_rate: number | null
  global_score: number | null
  total_requests: number
}

// API payloads
export interface CreateRequestPayload {
  patient_name?: string
  patient_phone: string
  patient_neighborhood_id: string
  patient_lat?: number
  patient_lng?: number
  medicines: string[]
  notes?: string
}

export interface NearbyPharmaciesQuery {
  lat: number
  lng: number
  limit?: number
  max_distance_meters?: number
}

export interface PharmacyWithDistance extends Pharmacy {
  distance_meters: number
  selection_score: number
}

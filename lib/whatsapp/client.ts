const BASE_URL = 'https://graph.facebook.com/v19.0'
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

export interface WaSendResult {
  messages: { id: string }[]
  contacts: { wa_id: string }[]
}

async function post(path: string, body: unknown): Promise<WaSendResult> {
  const res = await fetch(`${BASE_URL}/${PHONE_ID}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${err}`)
  }

  return res.json()
}

export async function sendPharmacyRequest(
  to: string,
  pharmacyName: string,
  medicines: string[],
  neighborhood: string,
  requestPharmacyId: string
): Promise<WaSendResult> {
  const medicineList = medicines.map((m, i) => `${i + 1}. ${m}`).join('\n')

  return post('/messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `*MedFinder — Demande de médicaments*\n\nBonjour *${pharmacyName}*,\n\nUn patient du quartier *${neighborhood}* recherche :\n\n${medicineList}\n\nPouvez-vous confirmer la disponibilité ?`,
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `AVAILABLE_${requestPharmacyId}`,
              title: '✅ Disponible',
            },
          },
          {
            type: 'reply',
            reply: {
              id: `UNAVAILABLE_${requestPharmacyId}`,
              title: '❌ Indisponible',
            },
          },
        ],
      },
    },
  })
}

export async function sendPatientResults(
  to: string,
  medicines: string[],
  availablePharmacies: Array<{
    name: string
    address: string | null
    distance_meters: number
    phone: string
  }>
): Promise<WaSendResult> {
  const medicineList = medicines.join(', ')

  let body: string

  if (availablePharmacies.length === 0) {
    body = `*MedFinder* — Résultats de votre recherche\n\nMédicaments : ${medicineList}\n\n⚠️ Aucune pharmacie disponible n'a été trouvée pour le moment.\n\nVeuillez réessayer dans quelques instants ou contacter directement une pharmacie.`
  } else {
    const pharmList = availablePharmacies
      .map(
        (p, i) =>
          `${i + 1}. *${p.name}*\n   📍 ${p.address ?? 'Voir localisation'} (${Math.round(p.distance_meters / 100) * 100}m)\n   📞 ${p.phone}`
      )
      .join('\n\n')

    body = `*MedFinder* — Résultats de votre recherche\n\nMédicaments : ${medicineList}\n\n✅ ${availablePharmacies.length} pharmacie(s) disponible(s) :\n\n${pharmList}\n\n_Résultats classés par disponibilité et proximité._`
  }

  return post('/messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  })
}

export async function sendPatientFeedbackRequest(
  to: string
): Promise<WaSendResult> {
  return post('/messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `*MedFinder* — Suivi de votre demande\n\nBonjour, avez-vous pu trouver vos médicaments ?`,
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: 'FEEDBACK_FOUND', title: '✅ Oui, trouvé' },
          },
          {
            type: 'reply',
            reply: { id: 'FEEDBACK_NOT_FOUND', title: '❌ Non, pas trouvé' },
          },
        ],
      },
    },
  })
}

import { createHmac } from 'crypto'

export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) return false

  const secret = process.env.WHATSAPP_WEBHOOK_SECRET!
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return signature === `sha256=${expected}`
}

export interface InboundButtonReply {
  type: 'button_reply'
  requestPharmacyId: string
  isAvailable: boolean
  fromPhone: string
  waMessageId: string
  timestamp: number
}

export interface InboundTextMessage {
  type: 'text'
  text: string
  fromPhone: string
  waMessageId: string
  timestamp: number
}

export interface InboundFeedback {
  type: 'feedback'
  isFound: boolean
  fromPhone: string
  waMessageId: string
  timestamp: number
}

export type ParsedWebhookMessage =
  | InboundButtonReply
  | InboundTextMessage
  | InboundFeedback

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWebhookMessage(payload: any): ParsedWebhookMessage | null {
  try {
    const message =
      payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

    if (!message) return null

    const fromPhone: string = message.from
    const waMessageId: string = message.id
    const timestamp: number = parseInt(message.timestamp, 10)

    if (message.type === 'interactive') {
      const buttonId: string = message.interactive.button_reply.id

      if (buttonId.startsWith('AVAILABLE_') || buttonId.startsWith('UNAVAILABLE_')) {
        const isAvailable = buttonId.startsWith('AVAILABLE_')
        const requestPharmacyId = buttonId.replace(/^(AVAILABLE|UNAVAILABLE)_/, '')
        return { type: 'button_reply', requestPharmacyId, isAvailable, fromPhone, waMessageId, timestamp }
      }

      if (buttonId === 'FEEDBACK_FOUND' || buttonId === 'FEEDBACK_NOT_FOUND') {
        return {
          type: 'feedback',
          isFound: buttonId === 'FEEDBACK_FOUND',
          fromPhone,
          waMessageId,
          timestamp,
        }
      }
    }

    if (message.type === 'text') {
      const text: string = message.text?.body ?? ''
      const upper = text.toUpperCase().trim()

      if (upper === 'OUI' || upper === 'NON') {
        return {
          type: 'feedback',
          isFound: upper === 'OUI',
          fromPhone,
          waMessageId,
          timestamp,
        }
      }

      return { type: 'text', text, fromPhone, waMessageId, timestamp }
    }

    return null
  } catch {
    return null
  }
}

import pb from '@/lib/pocketbase/client'

export interface WhatsAppRecipient {
  phone: string
  name?: string
}

export interface WhatsAppResultItem {
  phone: string
  name?: string
  status: 'sent' | 'failed'
  error?: string
}

export interface WhatsAppSendResult {
  success: number
  failed: number
  total: number
  results: WhatsAppResultItem[]
}

export const sendWhatsAppMessages = async (
  recipients: WhatsAppRecipient[],
  message: string,
): Promise<WhatsAppSendResult> => {
  return pb.send('/backend/v1/meta-whatsapp/send', {
    method: 'POST',
    body: JSON.stringify({ recipients, message }),
    headers: { 'Content-Type': 'application/json' },
  })
}

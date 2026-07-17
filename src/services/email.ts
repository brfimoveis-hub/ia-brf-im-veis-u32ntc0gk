import pb from '@/lib/pocketbase/client'

export interface SendEmailResult {
  success: boolean
  message?: string
  error?: string
  recipient?: string
}

export interface BulkSendEmailResult {
  success: boolean
  sent: number
  failed: number
  errors: Array<{ id: string; error: string }>
  message: string
}

export const sendEmail = async (
  customerId: string,
  subject: string,
  body: string,
): Promise<SendEmailResult> => {
  return pb.send('/backend/v1/send-email', {
    method: 'POST',
    body: { customer_id: customerId, subject, body },
  })
}

export const bulkSendEmail = async (
  customerIds: string[],
  subject: string,
  body: string,
): Promise<BulkSendEmailResult> => {
  return pb.send('/backend/v1/bulk-send-email', {
    method: 'POST',
    body: { customer_ids: customerIds, subject, body },
  })
}

import pb from '@/lib/pocketbase/client'

export interface SendEmailResult {
  success: boolean
  message?: string
  error?: string
  recipient?: string
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

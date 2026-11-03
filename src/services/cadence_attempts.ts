import { pb } from '@/lib/pocketbase/client'

export type CadenceAttemptStatus = 'sent' | 'rescheduled' | 'failed' | 'permanent_failure'

export interface CadenceAttempt {
  id: string
  customer_id: string
  user_id?: string
  step: string
  attempt_number: number
  max_attempts: number
  status: CadenceAttemptStatus
  failure_reason?: string
  next_attempt_at?: string
  sent_at?: string
  wamid?: string
  channel?: string
  message_preview?: string
  details?: Record<string, unknown>
  created: string
  updated: string
}

export async function getCustomerCadenceAttempts(
  customerId: string,
  limit = 20,
): Promise<CadenceAttempt[]> {
  if (!customerId) return []
  try {
    const records = await pb.collection('cadence_attempts').getList<CadenceAttempt>(1, limit, {
      filter: `customer_id = "${customerId}"`,
      sort: '-created',
      requestKey: `cadence_attempts_${customerId}`,
    })
    return records.items
  } catch (err) {
    console.warn('[cadence_attempts] Erro ao carregar tentativas do cliente:', err)
    return []
  }
}

export async function getLatestCadenceAttemptForStep(
  customerId: string,
  step: string,
): Promise<CadenceAttempt | null> {
  if (!customerId || !step) return null
  try {
    const records = await pb.collection('cadence_attempts').getList<CadenceAttempt>(1, 1, {
      filter: `customer_id = "${customerId}" && step = "${step}"`,
      sort: '-created',
      requestKey: `cadence_attempts_step_${customerId}_${step}`,
    })
    return records.items[0] || null
  } catch {
    return null
  }
}

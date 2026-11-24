/**
 * Reprocessar última mensagem entrante do cliente — chama o endpoint
 * backend /backend/v1/bia_reprocess (sessão do painel obrigatória).
 * Usado quando a Bia fica calada: reativa o gatilho do motor ai_auto_reply.
 */
import { pb } from '@/lib/pocketbase/client'

export interface ReprocessResponse {
  reprocessed: boolean
  reason?: string
  content?: string
  error?: string
  note?: string
}

export async function reprocessCustomerLastInbound(customerId: string): Promise<ReprocessResponse> {
  try {
    const res = await pb.send('/api/backend/v1/bia_reprocess', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId }),
      headers: { 'Content-Type': 'application/json' },
    })
    return res as ReprocessResponse
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(message || 'Falha ao reprocessar mensagem do cliente.')
  }
}

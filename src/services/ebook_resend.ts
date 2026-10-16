import pb from '@/lib/pocketbase/client'

export interface EbookAuditSummary {
  total_approached: number
  already_delivered: number
  excluded_count: number
  eligible_pending_count: number
}

export interface EbookPendingClient {
  id: string
  name: string
  greeting_name: string
  phone: string
  status?: string
  follow_up_step?: string
  follow_up_count?: number
  last_conv_date?: string | null
  exclusion_reason?: string | null
}

export interface EbookAuditResponse {
  success: boolean
  commercial_window: {
    hour: number
    minute: number
    dayOfWeek: number
    isCommercialWindow: boolean
    iso: string
  }
  book_link: string
  summary: EbookAuditSummary
  eligible_pending: EbookPendingClient[]
  excluded_sample?: EbookPendingClient[]
  checked_at: string
  error?: string
}

export interface EbookBatchResponse {
  success: boolean
  dispatched_count: number
  failed_count: number
  remaining_pending: number
  dispatched: Array<{ id: string; phone: string; name: string }>
  failed: Array<{ id: string; phone: string; error: string }>
  message: string
  error?: string
}

/**
 * Consulta a auditoria de pendência de e-book na base
 */
export async function getEbookResendAudit(): Promise<EbookAuditResponse> {
  return pb.send<EbookAuditResponse>('/backend/v1/ebook-resend/audit', {
    method: 'GET',
  })
}

/**
 * Dispara um lote seguro de reenvio do e-book (máx 15 por ciclo)
 */
export async function dispatchEbookResendBatch(options?: {
  batch_size?: number
  force_outside_window?: boolean
}): Promise<EbookBatchResponse> {
  return pb.send<EbookBatchResponse>('/backend/v1/ebook-resend/batch', {
    method: 'POST',
    body: {
      batch_size: options?.batch_size || 15,
      force_outside_window: !!options?.force_outside_window,
    },
  })
}

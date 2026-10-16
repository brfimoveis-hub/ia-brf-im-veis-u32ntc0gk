import pb from '@/lib/pocketbase/client'

export interface EbookAuditSummary {
  total_approached: number
  already_delivered: number
  excluded_count: number
  eligible_pending_count: number
  invalid_phones_count?: number
}

export interface EbookPendingClient {
  id: string
  name: string
  greeting_name: string
  phone: string
  raw_phone?: string
  status?: string
  follow_up_step?: string
  follow_up_count?: number
  last_conv_date?: string | null
  exclusion_reason?: string | null
}

export interface EbookInvalidPhoneClient {
  id: string
  name: string
  raw_phone: string
  reason: string
}

export interface EbookContinuousModeState {
  is_active: boolean
  next_batch_at: string | null
  last_dispatched_at?: string | null
  last_dispatched_count?: number
  remaining_pending?: number
  stop_reason?: string | null
  regua_is_active?: boolean
}

export interface EbookAuditResponse {
  success: boolean
  commercial_window: {
    hour: number
    minute: number
    dayOfWeek: number
    isCommercialWindow: boolean
    iso: string
    brTimeString?: string
  }
  book_link: string
  storage_url?: string
  storage_source?: string
  delivery_mechanism?: string
  summary: EbookAuditSummary
  eligible_pending: EbookPendingClient[]
  invalid_phones?: EbookInvalidPhoneClient[]
  excluded_sample?: EbookPendingClient[]
  continuous_mode?: EbookContinuousModeState
  checked_at: string
  error?: string
}

export interface EbookBatchResponse {
  success: boolean
  dispatched_count: number
  failed_count: number
  remaining_pending: number
  dispatched: Array<{ id: string; phone: string; name?: string; document_sent?: boolean }>
  failed: Array<{ id: string; phone: string; error: string }>
  message: string
  regua_paused?: boolean
  outside_window?: boolean
  error?: string
}

export interface EbookContinuousToggleResponse {
  success: boolean
  is_active: boolean
  next_batch_at?: string | null
  message: string
  continuous_mode?: EbookContinuousModeState
  first_batch?: EbookBatchResponse
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

/**
 * Liga ou desliga o Modo Contínuo de reenvio de e-book
 */
export async function toggleEbookContinuousMode(options: {
  action: 'start' | 'stop' | 'toggle'
  force_outside_window?: boolean
  reason?: string
}): Promise<EbookContinuousToggleResponse> {
  return pb.send<EbookContinuousToggleResponse>('/backend/v1/ebook-resend/continuous-toggle', {
    method: 'POST',
    body: {
      action: options.action,
      force_outside_window: !!options.force_outside_window,
      reason: options.reason,
    },
  })
}

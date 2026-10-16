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
  normalized_digits?: string
  status?: string
}

export interface PhoneAuditResponse {
  success: boolean
  auto_tag?: boolean
  audit: {
    total_customers: number
    valid_phones_count: number
    invalid_phones_count: number
    tagged_now_count?: number
    reason_breakdown: Record<string, number>
    invalid_phones: EbookInvalidPhoneClient[]
    sample_invalid?: EbookInvalidPhoneClient[]
  }
  timestamp: string
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
 * Consulta a auditoria completa de telefones da base inteira (customers)
 */
export async function getFullPhoneAudit(autoTag = false): Promise<PhoneAuditResponse> {
  return pb.send<PhoneAuditResponse>(
    `/backend/v1/phone-audit?auto_tag=${autoTag ? 'true' : 'false'}`,
    {
      method: 'GET',
    },
  )
}

/**
 * Executa uma varredura completa da base gravando tags nos números inválidos
 */
export async function runFullPhoneScan(): Promise<{
  success: boolean
  summary: {
    total_customers: number
    valid_phones_count: number
    invalid_phones_count: number
    newly_tagged_count: number
    already_tagged_count: number
    reason_breakdown: Record<string, number>
  }
  sample_invalid: EbookInvalidPhoneClient[]
  message: string
}> {
  return pb.send('/backend/v1/phone-audit/scan', {
    method: 'POST',
  })
}

/**
 * Validação de telefone brasileiro idêntica à regra de backend
 */
export function validateBrazilianPhoneLocal(rawPhone: string): {
  valid: boolean
  phone: string
  errorReason: string | null
} {
  if (!rawPhone) {
    return { valid: false, phone: '', errorReason: 'Telefone vazio ou ausente' }
  }
  let str = String(rawPhone).trim()

  if (str.includes(':::')) {
    const parts = str
      .split(':::')
      .map((p) => p.trim())
      .filter(Boolean)
    for (let i = 0; i < parts.length; i++) {
      const partRes = validateBrazilianPhoneLocal(parts[i])
      if (partRes.valid) return partRes
    }
    str = parts[0] || str
  }

  let digits = str.replace(/\D/g, '')

  if (digits.startsWith('0') && digits.length >= 11) {
    digits = digits.substring(1)
  }

  if (digits.length === 8 || digits.length === 9) {
    digits = '48' + digits
  }

  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = '55' + digits
  }

  if (digits.length >= 20 && digits.length <= 26 && digits.length % 2 === 0) {
    const half = digits.length / 2
    const firstHalf = digits.substring(0, half)
    const secondHalf = digits.substring(half)
    if (firstHalf === secondHalf) {
      const subRes = validateBrazilianPhoneLocal(firstHalf)
      if (subRes.valid) return subRes
    }
  }

  if (digits.length < 12) {
    return {
      valid: false,
      phone: digits,
      errorReason: `Número incompleto (${digits.length} dígitos, mín 12 com 55+DDD)`,
    }
  }
  if (digits.length > 13) {
    return {
      valid: false,
      phone: digits,
      errorReason: `Número corrompido / duplicado (${digits.length} dígitos, máx 13)`,
    }
  }
  if (!digits.startsWith('55')) {
    return {
      valid: false,
      phone: digits,
      errorReason: 'DDI inválido (esperado 55 Brasil)',
    }
  }

  const ddd = parseInt(digits.substring(2, 4), 10)
  if (isNaN(ddd) || ddd < 11 || ddd > 99) {
    return {
      valid: false,
      phone: digits,
      errorReason: `DDD brasileiro inválido: ${digits.substring(2, 4)}`,
    }
  }

  return {
    valid: true,
    phone: digits,
    errorReason: null,
  }
}

/**
 * Corrige inline o telefone de um cliente no banco.
 * Se passar na validação, remove automaticamente as tags telefone_invalido e erro_numero_whatsapp
 * para que o cliente volte a ser elegível à fila de reenvio / régua.
 */
export async function fixCustomerPhoneInline(
  customerId: string,
  newPhone: string,
): Promise<{ success: boolean; error?: string; cleanPhone?: string }> {
  const check = validateBrazilianPhoneLocal(newPhone)
  if (!check.valid) {
    return { success: false, error: check.errorReason || 'Número inválido' }
  }

  try {
    const cust = await pb.collection('customers').getOne(customerId)
    const rawTags = (cust as { tags?: string[] }).tags || []
    let tagsList = Array.isArray(rawTags) ? [...rawTags] : []

    // Remove as tags de erro para reabilitar o cliente na régua e reenvio
    tagsList = tagsList.filter((t) => t !== 'telefone_invalido' && t !== 'erro_numero_whatsapp')

    await pb.collection('customers').update(customerId, {
      phone: check.phone,
      phone_1_value: check.phone,
      tags: tagsList,
    })

    return { success: true, cleanPhone: check.phone }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
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

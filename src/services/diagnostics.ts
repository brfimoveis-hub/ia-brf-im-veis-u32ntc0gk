import pb from '@/lib/pocketbase/client'

export interface DiagnosticResult {
  name: string
  success: boolean
  message: string
}

export interface WhatsAppDiagnosticDetails {
  phone_number_id?: string
  waba_id?: string
  data?: any
  waba?: any
  subscribed_apps?: any
  is_registered?: boolean
  status?: string
  code_verification_status?: string
  quality_rating?: string
  display_phone_number?: string
  verified_name?: string
  note?: string
  error?: string
  is_token_expired?: boolean
}

export const getWhatsAppRegistrationDiagnostic = async (): Promise<
  WhatsAppDiagnosticDetails & { success: boolean }
> => {
  try {
    const res = await pb.send('/backend/v1/diagnostic_whatsapp', { method: 'POST' })
    return res
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha de comunicação',
    }
  }
}

export const registerWhatsAppNumber = async (pin: string, dataLocalizationRegion?: string) => {
  return await pb.send('/backend/v1/meta_whatsapp_register', {
    method: 'POST',
    body: {
      pin: pin.trim(),
      ...(dataLocalizationRegion
        ? { data_localization_region: dataLocalizationRegion.trim() }
        : {}),
    },
  })
}

export const testWhatsApp = async (): Promise<DiagnosticResult> => {
  const res = await pb.send('/backend/v1/diagnostic_whatsapp', { method: 'POST' })
  let msg = 'Falha na conexão.'
  if (res.success) {
    if (res.is_registered || res.status === 'CONNECTED') {
      msg = `Conectado e Registrado (${res.display_phone_number || res.status})`
    } else {
      msg = `Pendente de Registro PIN (${res.status || 'PENDING'}, code=${res.code_verification_status || 'VERIFIED'})`
    }
  } else {
    msg = res.error || 'Falha na conexão.'
  }
  return {
    name: 'WhatsApp Cloud API',
    success: !!res.success,
    message: msg,
  }
}

export const testCAPI = async (): Promise<DiagnosticResult> => {
  const res = await pb.send('/backend/v1/diagnostic_capi', { method: 'POST' })
  return {
    name: 'Conversions API (CAPI)',
    success: !!res.success,
    message: res.success
      ? `Pixel válido: ${res.pixel_name || res.pixel_id || 'OK'}`
      : res.error || 'Falha na conexão.',
  }
}

export const testWhatsAppWebhook = async (): Promise<DiagnosticResult> => {
  const res = await pb.send('/backend/v1/diagnostic_whatsapp_webhook', { method: 'POST' })
  return {
    name: 'WhatsApp Webhook',
    success: !!res.success,
    message: res.message || (res.success ? 'Configurado' : res.error || 'Falha.'),
  }
}

export const testLeadFormsWebhook = async (): Promise<DiagnosticResult> => {
  const res = await pb.send('/backend/v1/diagnostic_lead_forms_webhook', { method: 'POST' })
  return {
    name: 'Lead Forms Webhook',
    success: !!res.success,
    message: res.message || (res.success ? 'Acessível' : res.error || 'Falha.'),
  }
}

export const runAllDiagnostics = async (): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = []
  const tests: Array<() => Promise<DiagnosticResult>> = [
    testWhatsApp,
    testCAPI,
    testWhatsAppWebhook,
    testLeadFormsWebhook,
  ]

  for (const test of tests) {
    try {
      results.push(await test())
    } catch (e: any) {
      results.push({
        name: 'Desconhecido',
        success: false,
        message: e.message || 'Erro de rede ou backend indisponível.',
      })
    }
  }

  return results
}

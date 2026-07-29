import pb from '@/lib/pocketbase/client'

export interface DiagnosticResult {
  name: string
  success: boolean
  message: string
}

export const testWhatsApp = async (): Promise<DiagnosticResult> => {
  const res = await pb.send('/backend/v1/diagnostic_whatsapp', { method: 'POST' })
  return {
    name: 'WhatsApp Cloud API',
    success: !!res.success,
    message: res.success
      ? `Conectado: ${res.display_phone_number || res.name || 'OK'}`
      : res.error || 'Falha na conexão.',
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

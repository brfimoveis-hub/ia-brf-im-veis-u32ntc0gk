import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Mapeamento e tradução de mensagens padrão do PocketBase para Português (Brasil)
 */
function translateFieldMessage(field: string, rawMessage: string): string {
  const lowerMsg = (rawMessage || '').toLowerCase()

  // Erros comuns de campos do Scheduled Posts e do CRM
  if (field === 'caption') {
    if (
      lowerMsg.includes('required') ||
      lowerMsg.includes('missing') ||
      lowerMsg.includes('cannot be blank')
    ) {
      return 'Preencha a legenda do post.'
    }
    return 'Legenda inválida ou fora dos padrões permitidos.'
  }

  if (field === 'scheduled_at') {
    return 'Data ou horário de agendamento inválido.'
  }

  if (field === 'images' || field === 'image_files' || field === 'image_urls') {
    return 'Arquivo de imagem inválido ou acima do limite permitido.'
  }

  if (field === 'launch') {
    return 'Lançamento selecionado inválido ou não encontrado.'
  }

  if (field === 'user_id') {
    return 'Usuário autenticado inválido para este registro.'
  }

  // Traduções genéricas para validações comuns de campos do PocketBase
  if (
    lowerMsg.includes('cannot be blank') ||
    lowerMsg.includes('must be set') ||
    lowerMsg.includes('is required')
  ) {
    return `O campo "${field}" é obrigatório.`
  }
  if (lowerMsg.includes('must be unique') || lowerMsg.includes('unique')) {
    return `O valor informado para "${field}" já está em uso.`
  }
  if (lowerMsg.includes('failed to upload') || lowerMsg.includes('max file size')) {
    return `Falha ao processar arquivo em "${field}". Tamanho acima do limite permitido.`
  }

  return rawMessage
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      const originalMsg = (detail as { message: string }).message
      errors[field] = translateFieldMessage(field, originalMsg)
    }
  }
  return errors
}

/**
 * Retorna mensagem de erro amigável sempre em Português do Brasil.
 * Nunca vaza mensagens brutas em inglês como "Something went wrong while processing your request."
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.'
  }

  // Tratar ClientResponseError do PocketBase
  if (error instanceof ClientResponseError) {
    // 1. Verificar se há erros detalhados por campo na resposta
    const fieldErrors = extractFieldErrors(error)
    const fieldMsgs = Object.values(fieldErrors)
    if (fieldMsgs.length > 0) {
      return fieldMsgs.join(' ')
    }

    // 2. Status HTTP específicos
    if (error.status === 401) {
      return 'Sessão expirada. Recarregue a página ou faça login novamente.'
    }
    if (error.status === 403) {
      return 'Permissão negada. Você não tem autorização para realizar esta operação.'
    }
    if (error.status === 404) {
      return 'Registro não encontrado ou foi removido.'
    }
    if (error.status === 0) {
      return 'Falha de conexão com o servidor. Verifique sua internet.'
    }

    // 3. Traduzir mensagens padrão do PocketBase v0.36 / v0.2x
    const raw = (error.message || '').trim().toLowerCase()
    if (
      raw.includes('something went wrong') ||
      raw.includes('failed to create') ||
      raw.includes('failed to update') ||
      raw.includes('failed to delete') ||
      raw.includes('failed to authenticate')
    ) {
      return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.'
    }
    if (
      raw.includes('failed to fetch') ||
      raw.includes('network') ||
      raw.includes('connection refused')
    ) {
      return 'Falha de conexão com o servidor. Verifique sua internet.'
    }

    return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.'
  }

  // Erro genérico de Javascript
  if (error instanceof Error) {
    const raw = error.message.toLowerCase()
    if (
      raw.includes('failed to fetch') ||
      raw.includes('networkerror') ||
      raw.includes('network error') ||
      raw.includes('load failed')
    ) {
      return 'Falha de conexão com o servidor. Verifique sua internet.'
    }
    if (raw.includes('something went wrong')) {
      return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.'
    }
    // Se for mensagem de erro em inglês comum
    if (raw.includes('unauthorized') || raw.includes('forbidden')) {
      return 'Sessão expirada ou sem permissão. Tente fazer login novamente.'
    }
    return error.message
  }

  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.'
}

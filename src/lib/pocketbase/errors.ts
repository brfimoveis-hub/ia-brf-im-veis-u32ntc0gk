import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

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
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error) {
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Load failed')
      ) {
        return 'Falha na conexão com o servidor. Verifique sua internet ou tente novamente.'
      }
      return error.message
    }
    return 'Ocorreu um erro inesperado ao processar sua solicitação.'
  }

  // Se houver erros específicos de validação por campo
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) {
    return msgs.join(' ')
  }

  // Se a resposta retornou uma mensagem customizada do backend
  const responseMessage = (error.response?.message as string | undefined) || ''
  if (
    responseMessage &&
    !responseMessage.toLowerCase().includes('something went wrong while processing your request')
  ) {
    return responseMessage
  }

  const defaultMsg = error.message || ''
  if (
    !defaultMsg ||
    defaultMsg.toLowerCase().includes('something went wrong while processing your request') ||
    defaultMsg.includes('Failed to authenticate')
  ) {
    if (error.status === 0) {
      return 'Tempo limite esgotado ou falha de conexão com o servidor. Verifique sua conexão e tente novamente.'
    }
    if (error.status === 400) {
      return 'Dados da requisição inválidos. Verifique os campos preenchidos e tente novamente.'
    }
    if (error.status === 401) {
      return 'Sua sessão expirou ou você não está autenticado. Faça login novamente.'
    }
    if (error.status === 403) {
      return 'Você não tem permissão para realizar esta ação.'
    }
    if (error.status === 404) {
      return 'O recurso solicitado não foi encontrado.'
    }
    if (error.status >= 500) {
      return 'O servidor encontrou uma instabilidade temporária ao processar a campanha. Tente novamente em instantes.'
    }
    return 'Ocorreu um erro ao processar sua solicitação no servidor. Tente novamente.'
  }

  return defaultMsg
}

import pb from '@/lib/pocketbase/client'

export interface InstagramOAuthResult {
  success: boolean
  instagram_business_id: string
  page_id: string
}

export interface InstagramTestResult {
  success?: boolean
  status: string
  message?: string
  token_saved?: boolean
  data?: {
    id: string
    name?: string
    username?: string
  }
  missing_perms?: string[]
  granted_perms?: string[]
  instructions?: string
}

/**
 * Nova família de escopos Instagram Business (use_case_enum=INSTAGRAM_BUSINESS):
 * - instagram_business_basic: leitura de perfil e mídia da conta profissional
 * - instagram_business_manage_messages: leitura e envio de DMs no Instagram
 * - instagram_business_manage_comments: moderação e resposta a comentários
 *
 * OBSERVAÇÃO SOBRE ESCOPOS DE PÁGINA (pages_*):
 * O caso de uso INSTAGRAM_BUSINESS da Meta recusa os escopos legados `instagram_manage_messages`
 * e `instagram_basic` ("Invalid Scopes: instagram_manage_messages").
 * Para evitar conflito entre famílias no diálogo OAuth do app com use_case INSTAGRAM_BUSINESS,
 * solicitamos o trio canônico instagram_business_*. Caso o caso de uso requeira também sincronizar
 * páginas do Facebook diretamente no mesmo fluxo, escopos como pages_show_list / pages_messaging
 * podem ser reintroduzidos após aprovação no App Review correspondente.
 */
export const INSTAGRAM_OAUTH_SCOPES_LIST = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
]

const INSTAGRAM_OAUTH_SCOPES = INSTAGRAM_OAUTH_SCOPES_LIST.join(',')

export const INSTAGRAM_CALLBACK_PATH = '/settings/connections/instagram/callback'

export const PROD_ORIGIN = 'https://brfiacrminteligente.goskip.app'
export const PREVIEW_ORIGIN = 'https://ia-uazapi-6d79e--preview.goskip.app'
export const PROD_REDIRECT_URI = `${PROD_ORIGIN}${INSTAGRAM_CALLBACK_PATH}`
export const PREVIEW_REDIRECT_URI = `${PREVIEW_ORIGIN}${INSTAGRAM_CALLBACK_PATH}`

/**
 * Obtém a redirect URI do OAuth do Instagram.
 * Deriva da window.location.origin atual. Se estiver num dos domínios goskip.app
 * conhecidos (produção ou preview), usa o origin correspondente; caso contrário,
 * usa window.location.origin (ou fallback para produção).
 */
export function getInstagramRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    if (
      origin === PROD_ORIGIN ||
      origin === PREVIEW_ORIGIN ||
      origin.includes('goskip.app') ||
      origin.includes('localhost')
    ) {
      return `${origin}${INSTAGRAM_CALLBACK_PATH}`
    }
    return `${origin}${INSTAGRAM_CALLBACK_PATH}`
  }
  return PROD_REDIRECT_URI
}

export const INSTAGRAM_OAUTH_STATE_KEY = 'instagram_oauth_state'

/**
 * Gera um token de state aleatório, salva em sessionStorage para prevenção CSRF
 * e retorna a URL completa do diálogo OAuth da Meta.
 */
export function getInstagramOAuthUrl(
  appId: string,
  redirectUri: string,
  customState?: string,
): string {
  let state = customState
  if (!state) {
    if (
      typeof window !== 'undefined' &&
      window.crypto &&
      typeof window.crypto.randomUUID === 'function'
    ) {
      state = `ig_${window.crypto.randomUUID()}`
    } else {
      state = `ig_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    }
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(INSTAGRAM_OAUTH_STATE_KEY, state)
    } catch {
      // Ignora erro em quota/modo restrito
    }
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_OAUTH_SCOPES,
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`
}

/**
 * Valida o state recebido contra o armazenado em sessionStorage.
 * Limpa o state armazenado após leitura (ou tentativa).
 */
export function validateAndConsumeInstagramOAuthState(incomingState: string | null): {
  valid: boolean
  expected: string | null
  received: string | null
} {
  let stored: string | null = null
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      stored = window.sessionStorage.getItem(INSTAGRAM_OAUTH_STATE_KEY)
      // Não remove imediatamente para permitir leitura no diagnóstico se necessário,
      // mas consome ao validar
      if (stored) {
        window.sessionStorage.removeItem(INSTAGRAM_OAUTH_STATE_KEY)
      }
    } catch {
      // ignore
    }
  }

  // Compatibilidade: se o state enviado foi o legado fixo 'instagram_oauth'
  if (incomingState === 'instagram_oauth') {
    return { valid: true, expected: stored, received: incomingState }
  }

  // Se havia state gravado, compara estritamente
  if (stored && incomingState) {
    return {
      valid: stored === incomingState,
      expected: stored,
      received: incomingState,
    }
  }

  // Se não havia state gravado (ex: aba aberta diretamente ou sessionStorage limpo),
  // se incomingState existir com prefixo ig_ mas sem stored, marcamos inválido
  return {
    valid: Boolean(stored && incomingState && stored === incomingState),
    expected: stored,
    received: incomingState,
  }
}

export function exchangeInstagramCode(
  code: string,
  redirectUri: string,
): Promise<InstagramOAuthResult> {
  return pb.send('/backend/v1/instagram/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function testInstagramConnection(): Promise<InstagramTestResult> {
  return pb.send('/backend/v1/instagram/test_connection', {
    method: 'POST',
  })
}

export function testMessengerConnection(): Promise<InstagramTestResult> {
  return pb.send('/backend/v1/messenger/test_connection', {
    method: 'POST',
  })
}

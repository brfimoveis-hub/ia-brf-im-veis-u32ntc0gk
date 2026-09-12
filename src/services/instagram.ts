import pb from '@/lib/pocketbase/client'

export interface InstagramOAuthResult {
  success: boolean
  instagram_business_id: string
  page_id: string
}

export interface InstagramGraphError {
  http_status?: number
  message: string
  code?: number | null
  subcode?: number | null
  user_msg?: string | null
  type?: string | null
}

export interface InstagramTestedToken {
  type: string
  token_suffix?: string
  status: string
  http_status?: number
  graph_error?: InstagramGraphError
  direct_error?: InstagramGraphError
  accounts_error?: InstagramGraphError
  accounts_count?: number
  message?: string
}

export interface InstagramTokenIdentity {
  id?: string
  name?: string
  type?: string
  http_status?: number
  error?: InstagramGraphError
}

export interface InstagramAccessiblePage {
  page_id: string
  page_name: string
  has_instagram: boolean
  ig_account_id?: string | null
  ig_username?: string | null
  matches_target_id?: boolean
}

export interface InstagramPageLinkedAccount {
  linked: boolean
  id?: string | null
  username?: string | null
  name?: string | null
  page_id?: string
  page_name?: string
}

export interface InstagramPortfolioPage {
  page_id: string
  page_name: string
  ig_account_id?: string | null
  ig_username?: string | null
  has_ig: boolean
}

export interface InstagramTestResult {
  success?: boolean
  status: string
  message?: string
  token_saved?: boolean
  auto_corrected?: boolean
  old_instagram_business_id?: string
  instagram_business_id?: string
  data?: {
    id: string
    name?: string
    username?: string
  }
  page_id?: string
  page_name?: string
  missing_perms?: string[]
  granted_perms?: string[]
  instructions?: string
  app_id?: string
  graph_error?: InstagramGraphError
  token_identity?: InstagramTokenIdentity | null
  page_linked_instagram?: InstagramPageLinkedAccount | null
  accessible_pages?: InstagramAccessiblePage[]
  portfolio_scan?: InstagramPortfolioPage[]
  portfolio_scan_error?: string | null
  tested_tokens?: InstagramTestedToken[]
}

/**
 * Retorna o App ID prioritário para o Instagram (dedicado ou principal de fallback).
 */
export function getInstagramActiveAppId(
  user?: {
    meta_instagram_app_id?: string | null
    meta_app_id?: string | null
  } | null,
): string {
  if (!user) return ''
  return (user.meta_instagram_app_id || user.meta_app_id || '').trim()
}

/**
 * Escopos solicitados no OAuth do Instagram:
 *
 * CONTEXTO DO APP META DEDICADO ("BRF Imóveis 3"):
 * O usuário criou um app Meta dedicado com o caso de uso "Gerenciar mensagens e conteúdo no Instagram".
 * Na tela "Configuração da API com login do Facebook", a Meta lista exatamente estas permissões:
 * Bloco de mensagens:
 *   - instagram_basic
 *   - instagram_manage_messages
 *   - pages_read_engagement
 *   - pages_show_list
 *   - business_management
 *
 * Este app dedicado usa a família clássica/legada de escopos (instagram_basic, instagram_manage_messages)
 * combinada com as permissões de páginas e negócios necessárias, e NÃO a família nova `instagram_business_*`
 * (pedir `instagram_business_*` gera erro de "Invalid Scopes" no diálogo OAuth).
 *
 * A lista abaixo é solicitada tanto para o App ID dedicado (meta_instagram_app_id) quanto no fallback
 * do App ID principal (meta_app_id).
 */
export const INSTAGRAM_OAUTH_SCOPES_LIST = [
  'instagram_basic',
  'instagram_manage_messages',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
]

export const INSTAGRAM_OAUTH_SCOPES = INSTAGRAM_OAUTH_SCOPES_LIST.join(',')

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

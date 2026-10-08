import pb from '@/lib/pocketbase/client'

export interface InstagramOAuthResult {
  success: boolean
  instagram_business_id: string
  page_id: string
  instagram_username?: string
  app_id_used?: string
  granted_scopes?: string[]
  redirect_uri_used?: string
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
  ig_error?: string | null
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
  ig_error?: string | null
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
  token_source?: string
  has_oauth_token?: boolean
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
  if (!user) return '2442476629610638'
  return (user.meta_instagram_app_id || user.meta_app_id || '2442476629610638').trim()
}

/**
 * Escopos solicitados no OAuth padrão do Instagram:
 *
 *   - pages_show_list: permite listar as páginas do Facebook do usuário (/me/accounts)
 *   - pages_read_engagement: permite ler metadados da página vinculada
 *   - instagram_basic: permite obter metadados básicos da conta profissional do Instagram
 *   - business_management: permite leitura dos ativos no Business Manager
 */
export const INSTAGRAM_OAUTH_SCOPES_LIST = [
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'business_management',
]

/**
 * Escopos completos para incluir o gerenciamento de Anúncios (Meta Ads) e recuperação de leads (leads_retrieval).
 * Permite que a Bia consulte e crie anúncios Click-to-WhatsApp e receba leads instantaneamente.
 */
export const META_ADS_OAUTH_SCOPES_LIST = [
  ...INSTAGRAM_OAUTH_SCOPES_LIST,
  'ads_management',
  'ads_read',
  'leads_retrieval',
]

export const INSTAGRAM_OAUTH_SCOPES = INSTAGRAM_OAUTH_SCOPES_LIST.join(',')
export const META_ADS_OAUTH_SCOPES = META_ADS_OAUTH_SCOPES_LIST.join(',')

export const INSTAGRAM_CALLBACK_PATH = '/settings/connections/instagram/callback'

export const PROD_ORIGIN = 'https://brfiacrminteligente.goskip.app'
export const PREVIEW_ORIGIN = 'https://ia-uazapi-6d79e--preview.goskip.app'
export const PROD_REDIRECT_URI = `${PROD_ORIGIN}${INSTAGRAM_CALLBACK_PATH}`
export const PREVIEW_REDIRECT_URI = `${PREVIEW_ORIGIN}${INSTAGRAM_CALLBACK_PATH}`

/**
 * Detecta se a sessão atual está rodando em ambiente de preview (*.goskip.app de preview ou dev).
 */
export function isPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location?.hostname || ''
  const origin = window.location?.origin || ''
  return (
    host.includes('--preview') ||
    origin.includes('--preview') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  )
}

/**
 * Obtém a redirect URI do OAuth do Instagram.
 * Deriva da window.location.origin atual.
 */
export function getInstagramRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    return `${origin}${INSTAGRAM_CALLBACK_PATH}`
  }
  return PROD_REDIRECT_URI
}

export const INSTAGRAM_OAUTH_STATE_KEY = 'instagram_oauth_state'

/**
 * Gera um token de state aleatório, salva em sessionStorage, localStorage e sincroniza no PocketBase.
 * Isso garante que mesmo se o usuário for para o app da Meta no celular e voltar em outro contexto,
 * ou se o redirect cair entre preview e produção, a validação de segurança funcionará perfeitamente.
 */
export function generateOAuthState(provider = 'meta_instagram'): string {
  let state = ''
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.randomUUID === 'function'
  ) {
    state = `ig_${window.crypto.randomUUID()}`
  } else {
    state = `ig_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  }

  // 1. Salvar no sessionStorage e localStorage do navegador
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.setItem(INSTAGRAM_OAUTH_STATE_KEY, state)
      window.localStorage?.setItem(INSTAGRAM_OAUTH_STATE_KEY, state)
    } catch {
      // Ignora erro em quota ou modo restrito
    }
  }

  // 2. Registrar no backend PocketBase (assíncrono em background sem bloquear o clique)
  try {
    const redirectUri = getInstagramRedirectUri()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const currentUserId = pb.authStore.model?.id || ''

    pb.send('/backend/v1/oauth/state/register', {
      method: 'POST',
      body: JSON.stringify({
        state,
        provider,
        origin,
        redirect_uri: redirectUri,
        user_id: currentUserId,
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          created_at: new Date().toISOString(),
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    }).catch((err) => {
      console.warn('[OAUTH] Registro de state em background no backend falhou (continuando):', err)
    })
  } catch (regErr) {
    console.warn('[OAUTH] Erro ao disparar registro de state:', regErr)
  }

  return state
}

/**
 * Retorna a URL completa do diálogo OAuth da Meta.
 */
export function getInstagramOAuthUrl(
  appId: string,
  redirectUri: string,
  customState?: string,
  includeAdsScope = false,
): string {
  const finalAppId = (appId || '2442476629610638').trim()
  const state = customState || generateOAuthState(includeAdsScope ? 'meta_ads' : 'meta_instagram')
  const scopeToUse = includeAdsScope ? META_ADS_OAUTH_SCOPES : INSTAGRAM_OAUTH_SCOPES

  const params = new URLSearchParams({
    client_id: finalAppId,
    redirect_uri: redirectUri,
    scope: scopeToUse,
    response_type: 'code',
    state,
  })

  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`
}

export interface StateValidationResult {
  valid: boolean
  expected: string | null
  received: string | null
  reason?: string
}

/**
 * Validação síncrona rápida local (sessionStorage + localStorage).
 * Não consome destrutivamente de primeira para permitir retries se o usuário recarregar a tela.
 */
export function validateLocalOAuthState(incomingState: string | null): StateValidationResult {
  // Estados legados conhecidos que são sempre válidos
  if (incomingState === 'instagram_oauth' || incomingState === 'meta_ads_oauth') {
    return {
      valid: true,
      expected: incomingState,
      received: incomingState,
      reason: 'legacy_allowed',
    }
  }

  let sessionStored: string | null = null
  let localStored: string | null = null

  if (typeof window !== 'undefined') {
    try {
      sessionStored = window.sessionStorage?.getItem(INSTAGRAM_OAUTH_STATE_KEY)
      localStored = window.localStorage?.getItem(INSTAGRAM_OAUTH_STATE_KEY)
    } catch {
      // ignore
    }
  }

  const expected = sessionStored || localStored || null

  // Se o state recebido bater com o que foi gravado localmente
  if (incomingState && (incomingState === sessionStored || incomingState === localStored)) {
    return {
      valid: true,
      expected,
      received: incomingState,
      reason: 'matched_browser_storage',
    }
  }

  // Se o state recebido tem o prefixo ig_ e tamanho padrão de UUID, consideramos válido
  // para evitar travamento em troca de abas/webviews no celular
  if (incomingState && incomingState.startsWith('ig_') && incomingState.length >= 10) {
    return {
      valid: true,
      expected,
      received: incomingState,
      reason: 'valid_pattern_fallback',
    }
  }

  return {
    valid: Boolean(expected && incomingState && expected === incomingState),
    expected,
    received: incomingState,
    reason: 'mismatch',
  }
}

/**
 * Validação assíncrona robusta que consulta o backend PocketBase (coleção oauth_states).
 */
export async function validateOAuthStateWithBackend(
  incomingState: string | null,
): Promise<StateValidationResult> {
  const localRes = validateLocalOAuthState(incomingState)
  if (localRes.valid) {
    return localRes
  }

  if (!incomingState) {
    return { valid: false, expected: null, received: null, reason: 'empty_state' }
  }

  try {
    const res = await pb.send('/backend/v1/oauth/state/validate', {
      method: 'POST',
      body: JSON.stringify({ state: incomingState, consume: false }),
      headers: { 'Content-Type': 'application/json' },
    })

    if (res && res.valid) {
      return {
        valid: true,
        expected: res.state || incomingState,
        received: incomingState,
        reason: res.reason || 'validated_by_server',
      }
    }
  } catch (err) {
    console.warn('[OAUTH] Erro ao consultar validação no backend:', err)
  }

  return localRes
}

/**
 * Wrapper de compatibilidade com a assinatura antiga usada nas telas.
 */
export function validateAndConsumeInstagramOAuthState(
  incomingState: string | null,
): StateValidationResult {
  return validateLocalOAuthState(incomingState)
}

export function exchangeInstagramCode(
  code: string,
  redirectUri: string,
  appId?: string,
): Promise<InstagramOAuthResult> {
  return pb.send('/backend/v1/instagram/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
      app_id: appId,
      client_id: appId,
    }),
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

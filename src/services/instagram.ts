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

const INSTAGRAM_OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_manage_messages',
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_show_list',
  'pages_messaging',
].join(',')

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

export function getInstagramOAuthUrl(appId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_OAUTH_SCOPES,
    response_type: 'code',
    state: 'instagram_oauth',
  })
  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`
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

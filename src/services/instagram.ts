import pb from '@/lib/pocketbase/client'

export interface InstagramOAuthResult {
  success: boolean
  instagram_business_id: string
  page_id: string
}

export interface InstagramTestResult {
  status: string
  data?: {
    id: string
    name?: string
    username?: string
  }
}

const INSTAGRAM_OAUTH_SCOPES = [
  'pages_show_list',
  'instagram_basic',
  'instagram_manage_insights',
  'pages_read_engagement',
  'pages_messaging',
].join(',')

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

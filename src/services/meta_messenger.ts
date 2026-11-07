import pb from '@/lib/pocketbase/client'

export interface SaveAndSubscribeMessengerResult {
  success: boolean
  page_id?: string
  page_name?: string
  subscribed?: boolean
  subscription_warning?: string | null
  message: string
  error?: string
  code?: number
  subcode?: number
  granted_permissions?: string[]
}

export async function saveAndSubscribeMessengerPage(
  pageAccessToken: string,
  pageId: string = '1401557100168686',
  pageName: string = 'www.brfimoveis.com.br',
): Promise<SaveAndSubscribeMessengerResult> {
  return pb.send('/backend/v1/meta_messenger/save_and_subscribe', {
    method: 'POST',
    body: JSON.stringify({
      page_access_token: pageAccessToken.trim(),
      page_id: pageId.trim(),
      page_name: pageName.trim(),
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

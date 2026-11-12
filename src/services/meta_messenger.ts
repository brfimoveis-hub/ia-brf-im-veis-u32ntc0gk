export interface SaveAndSubscribeMessengerResult {
  success: boolean
  page_id: string
  page_name: string
  subscribed: boolean
  subscription_warning?: string
  message?: string
  token_extended?: boolean
  token_expires_in?: number
}

export async function saveAndSubscribeMessengerPage(
  accessToken: string,
  pageId: string,
  pageName: string,
): Promise<SaveAndSubscribeMessengerResult> {
  const pb = (await import('@/lib/pocketbase/client')).default
  const res = await pb.send<SaveAndSubscribeMessengerResult>(
    `/backend/v1/meta_messenger_save_and_subscribe`,
    {
      method: 'POST',
      body: { access_token: accessToken, page_id: pageId, page_name: pageName },
    },
  )
  return res
}

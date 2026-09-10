import pb from '@/lib/pocketbase/client'

export interface RemarketingCampaign {
  id: string
  user_id: string
  name: string
  segment?: string
  message_text: string
  template_name?: string
  template_language?: string
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'stopped'
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  requires_template_count: number
  sync_meta_capi: boolean
  capi_synced_count: number
  created: string
  updated: string
}

export interface RemarketingRecipient {
  id: string
  campaign_id: string
  customer_id?: string
  phone: string
  customer_name?: string
  resolved_message?: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'requires_template'
  whatsapp_message_id?: string
  error_message?: string
  in_24h_window?: boolean
  sent_at?: string
  created: string
  updated: string
  expand?: {
    customer_id?: {
      id: string
      name: string
      phone?: string
      email?: string
      status?: string
      lead_profile?: string
    }
  }
}

export interface SendWhatsAppCampaignPayload {
  name: string
  segment?: string
  message: string
  template_name?: string
  template_language?: string
  customer_ids: string[]
  sync_meta_capi?: boolean
}

export interface SendWhatsAppCampaignResponse {
  success: boolean
  campaign_id: string
  total: number
  sent: number
  requires_template: number
  failed: number
  capi_synced: number
  results: Array<{
    id?: string
    customer_id: string
    phone?: string
    customer_name?: string
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'requires_template'
    error?: string
    wamid?: string
  }>
}

export const getRemarketingCampaigns = async (): Promise<RemarketingCampaign[]> => {
  return pb.collection('remarketing_campaigns').getFullList<RemarketingCampaign>({
    sort: '-created',
  })
}

export const getRemarketingRecipients = async (
  campaignId: string,
): Promise<RemarketingRecipient[]> => {
  return pb.collection('remarketing_recipients').getFullList<RemarketingRecipient>({
    filter: `campaign_id = "${campaignId}"`,
    sort: '-created',
    expand: 'customer_id',
  })
}

export const sendWhatsAppCampaign = async (
  payload: SendWhatsAppCampaignPayload,
): Promise<SendWhatsAppCampaignResponse> => {
  return pb.send('/backend/v1/remarketing-campaigns/send', {
    method: 'POST',
    body: payload,
  })
}

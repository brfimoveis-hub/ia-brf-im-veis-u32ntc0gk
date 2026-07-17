import pb from '@/lib/pocketbase/client'

export interface EmailCampaign {
  id: string
  user_id: string
  name: string
  subject: string
  content: string
  status: 'draft' | 'sending' | 'completed' | 'failed'
  total_recipients: number
  success_count: number
  failure_count: number
  created: string
  updated: string
}

export interface EmailDelivery {
  id: string
  campaign_id: string
  customer_id: string
  status: 'pending' | 'sent' | 'failed'
  error_message: string
  created: string
  updated: string
  expand?: { customer_id?: any }
}

export const getCampaigns = () =>
  pb.collection('email_campaigns').getFullList<EmailCampaign>({ sort: '-created' })

export const getCampaign = (id: string) =>
  pb.collection('email_campaigns').getOne<EmailCampaign>(id)

export const createCampaign = (data: Partial<EmailCampaign>) =>
  pb.collection('email_campaigns').create<EmailCampaign>(data)

export const updateCampaign = (id: string, data: Partial<EmailCampaign>) =>
  pb.collection('email_campaigns').update<EmailCampaign>(id, data)

export const deleteCampaign = (id: string) => pb.collection('email_campaigns').delete(id)

export const getDeliveries = (campaignId: string) =>
  pb.collection('email_deliveries').getFullList<EmailDelivery>({
    filter: `campaign_id = "${campaignId}"`,
    sort: '-created',
    expand: 'customer_id',
  })

export const processCampaign = (campaignId: string, filter: Record<string, string>) =>
  pb.send('/backend/v1/process-email-campaign', {
    method: 'POST',
    body: { campaign_id: campaignId, filter },
  })

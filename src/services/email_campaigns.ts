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
  unique_opens: number
  unique_clicks: number
  total_opens: number
  total_clicks: number
  created: string
  updated: string
}

export interface EmailDelivery {
  id: string
  campaign_id: string
  customer_id: string
  status: 'pending' | 'sent' | 'failed'
  error_message: string
  opened_at: string
  clicked_at: string
  open_count: number
  click_count: number
  last_user_agent: string
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

export const getEngagedCustomerIds = async (): Promise<Set<string>> => {
  try {
    const campaigns = await pb.collection('email_campaigns').getList(1, 3, {
      filter: 'status = "completed"',
      sort: '-created',
    })
    if (campaigns.items.length < 3) return new Set()

    const campaignFilter = campaigns.items.map((c) => `campaign_id = "${c.id}"`).join(' || ')

    const deliveries = await pb.collection('email_deliveries').getFullList({
      filter: `(${campaignFilter}) && opened_at != ''`,
    })

    const openCounts = new Map<string, number>()
    for (const d of deliveries) {
      openCounts.set(d.customer_id, (openCounts.get(d.customer_id) || 0) + 1)
    }

    const engaged = new Set<string>()
    for (const [id, count] of openCounts) {
      if (count >= 3) engaged.add(id)
    }
    return engaged
  } catch {
    return new Set()
  }
}

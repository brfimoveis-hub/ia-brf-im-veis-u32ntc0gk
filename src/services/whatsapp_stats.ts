import pb from '@/lib/pocketbase/client'

export interface WhatsAppStatsSummary {
  total_sent_30d: number
  service_sent_30d: number
  incoming_received_30d: number
  total_messages_30d: number
  active_conversations_24h: number
  unique_customers_contacted_30d: number
  unique_customers_replied_30d: number
  response_rate_percent: number
  new_leads_30d: number
  ad_referral_leads_30d: number
  leads_current_month: number
  current_cost_brl_30d: number
  projected_cost_brl_30d: number
  cost_per_lead_current_brl: number
  cost_per_lead_projected_brl: number
  service_messages_current_month: number
  service_free_quota: number
  service_free_quota_remaining: number
  service_free_quota_percent_used: number
}

export interface WhatsAppStatsHealth {
  whatsapp_status: 'connected' | 'error' | 'unknown'
  whatsapp_number: string
  whatsapp_phone_id_configured: boolean
  webhook_configured: boolean
  capi_status: 'connected' | 'error' | 'warning'
  capi_error_details: string | null
  instagram_status: 'connected' | 'pending'
  templates: {
    total: number
    approved: number
    pending: number
    rejected: number
  }
}

export interface WhatsAppStatsCampaign {
  id: string
  name: string
  created: string
  segment: string
  status: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  replies_count: number
  response_rate_percent: number
  cost_brl: number
  cost_per_reply_brl: number
}

export interface WhatsAppStatsDailyPoint {
  date: string
  sent: number
  received: number
  leads: number
}

export interface WhatsAppStatsSettings {
  id: string | null
  usd_to_brl_rate: number
  marketing_rate_usd: number
  service_rate_usd: number
  marketing_rate_brl: number
  service_rate_brl: number
  monthly_leads_goal: number
  monthly_investment_budget_brl: number
  leads_goal_percent: number
  investment_goal_percent: number
}

export interface WhatsAppStatsResponse {
  summary: WhatsAppStatsSummary
  health: WhatsAppStatsHealth
  campaigns: WhatsAppStatsCampaign[]
  daily_history: WhatsAppStatsDailyPoint[]
  settings: WhatsAppStatsSettings
}

export interface UpdateSettingsPayload {
  usd_to_brl_rate?: number
  marketing_rate_usd?: number
  service_rate_usd?: number
  monthly_leads_goal?: number
  monthly_investment_budget_brl?: number
}

export const getWhatsAppStats = async (): Promise<WhatsAppStatsResponse> => {
  return pb.send<WhatsAppStatsResponse>('/backend/v1/whatsapp-stats', {
    method: 'GET',
  })
}

export const updateWhatsAppStatsSettings = async (
  payload: UpdateSettingsPayload,
): Promise<{ success: boolean; settings: Partial<WhatsAppStatsSettings> }> => {
  return pb.send<{ success: boolean; settings: Partial<WhatsAppStatsSettings> }>(
    '/backend/v1/whatsapp-stats/settings',
    {
      method: 'POST',
      body: payload,
    },
  )
}

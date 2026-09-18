import pb from '@/lib/pocketbase/client'

export interface MetaAdCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | string
  objective: string
  daily_budget_brl: number
  created_time: string
  spend_brl: number
  impressions: number
  reach: number
  clicks: number
  results: number
  cost_per_result_brl: number
}

export interface MetaAdsSummary {
  total_spend_brl: number
  total_impressions: number
  total_reach: number
  total_clicks: number
  total_results: number
  cpc_brl: number
  cpa_brl: number
}

export interface MetaAdAccount {
  id: string
  act_id: string
  name: string
  currency: string
  account_status: number
  score: number
}

export interface MetaAdsOverviewResponse {
  success: boolean
  needs_ads_permission: boolean
  reason?: 'missing_scope' | 'no_token' | string
  message?: string
  ad_account?: MetaAdAccount
  page?: {
    id: string
    name: string
    whatsapp_number: string
  }
  summary: MetaAdsSummary
  campaigns: MetaAdCampaign[]
  granted_permissions?: string[]
  error_details?: any
}

export interface CreateMetaCampaignPayload {
  name: string
  primary_text: string
  headline?: string
  description?: string
  image_url?: string
  daily_budget: number
  city?: string
  min_age?: number
  max_age?: number
}

export interface CreateMetaCampaignResponse {
  success: boolean
  needs_ads_permission?: boolean
  campaign_id?: string
  adset_id?: string
  creative_id?: string
  ad_id?: string
  name?: string
  status?: string
  daily_budget_brl?: number
  projected_monthly_spend_brl?: number
  message: string
  details?: any
}

export interface WhatsAppApprovedTemplate {
  id: string
  name: string
  category: string
  language: string
  body_text: string
  status: string
  meta_template_id?: string
}

export interface MetaAdsCreativesResponse {
  success: boolean
  templates: WhatsAppApprovedTemplate[]
  default_template?: WhatsAppApprovedTemplate | null
}

export async function getMetaAdsOverview(): Promise<MetaAdsOverviewResponse> {
  return pb.send<MetaAdsOverviewResponse>('/backend/v1/meta-ads/overview', {
    method: 'GET',
  })
}

export async function createMetaAdsCampaign(
  payload: CreateMetaCampaignPayload,
): Promise<CreateMetaCampaignResponse> {
  return pb.send<CreateMetaCampaignResponse>('/backend/v1/meta-ads/campaign', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function getMetaAdsCreatives(): Promise<MetaAdsCreativesResponse> {
  return pb.send<MetaAdsCreativesResponse>('/backend/v1/meta-ads/creatives', {
    method: 'GET',
  })
}

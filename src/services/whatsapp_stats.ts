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

export interface WhatsAppSendRecipient {
  id: string
  customer_id?: string
  customer_name: string
  customer_phone: string
  text_preview: string
  sent_at: string
  status: 'enviada' | 'entregue' | 'lida' | 'falhou' | 'outro' | string
  wamid?: string
  step?: string
}

export interface WhatsAppSendStatsTotals {
  enviadas: number
  clientes_distintos?: number
  entregues: number
  lidas: number
  falhas: number
  outros: number
  recebidas_de_clientes: number
}

export interface WhatsAppSendStatsRates {
  taxa_entrega: number
  taxa_leitura: number
  taxa_resposta: number
}

export interface WhatsAppSendStatsDaily {
  date: string
  enviadas: number
  clientes_distintos?: number
  entregues: number
  lidas: number
  falhas: number
  outros: number
  recebidas_de_clientes: number
}

export interface WhatsAppSendStatsResponse {
  success: boolean
  period_days: number
  since: string
  generated_at: string
  totals: WhatsAppSendStatsTotals
  rates_percent: WhatsAppSendStatsRates
  daily_history: WhatsAppSendStatsDaily[]
  recipients?: WhatsAppSendRecipient[]
}

import { getInboxThreads, type InboxThread } from '@/services/conversations'
import { normalizeCadenceStep } from '@/components/chat/CadenceTrackHeader'

export interface UnifiedWhatsAppStatsCounters {
  total: number
  activeCount: number
  pausedCount: number
  repliedTodayCount: number
  sentTodayCount: number
  advancesTodayCount: number
  activeConversations24h: number
  byStep: {
    remarketing: number
    d1: number
    d3: number
    d7: number
    d14: number
    nurturing_monthly: number
    finalizado: number
  }
}

/**
 * Deriva todos os contadores da régua e do atendimento a partir de uma lista
 * de threads da MESMA fonte (conversas / inbox).
 */
export function deriveStatsFromThreads(
  threads: InboxThread[],
  advancesToday = 0,
): UnifiedWhatsAppStatsCounters {
  const today = new Date().toDateString()
  let active = 0
  let paused = 0
  let repliedToday = 0
  let sentToday = 0
  let active24h = 0

  const byStep = {
    remarketing: 0,
    d1: 0,
    d3: 0,
    d7: 0,
    d14: 0,
    nurturing_monthly: 0,
    finalizado: 0,
  }

  for (const t of threads) {
    const stepKey = normalizeCadenceStep(t.follow_up_step) as keyof typeof byStep
    if (byStep[stepKey] !== undefined) {
      byStep[stepKey]++
    } else {
      byStep.d1++
    }

    const tagsStr = Array.isArray(t.tags) ? t.tags.join(' ').toLowerCase() : ''
    const isPaused =
      tagsStr.includes('ai_paused') || t.persistence_status === 'pausado' || t.is_blocked === true

    if (isPaused) {
      paused++
    } else {
      active++
    }

    if (t.unread_or_active) {
      active24h++
    }

    const msgDate = t.last_message_time ? new Date(t.last_message_time).toDateString() : ''
    if (msgDate === today) {
      if (t.sender === 'customer') {
        repliedToday++
      }
      if (t.sender === 'ai') {
        sentToday++
      }
    }
  }

  return {
    total: threads.length,
    activeCount: active,
    pausedCount: paused,
    repliedTodayCount: repliedToday,
    sentTodayCount: sentToday,
    advancesTodayCount: advancesToday,
    activeConversations24h: active24h,
    byStep,
  }
}

/**
 * Busca os contadores unificados direto da mesma função que popula a lista de conversas
 * (getInboxThreads em src/services/conversations.ts), garantindo consistência total.
 */
export const getUnifiedCadenceCounters = async (
  userId?: string,
): Promise<UnifiedWhatsAppStatsCounters> => {
  const threads = await getInboxThreads(userId)
  return deriveStatsFromThreads(threads)
}

export const getWhatsAppSendStats = async (): Promise<WhatsAppSendStatsResponse> => {
  return pb.send<WhatsAppSendStatsResponse>('/backend/v1/whatsapp-send-stats', {
    method: 'GET',
  })
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

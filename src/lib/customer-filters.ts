// The canonical 10-step sales pipeline. This MUST match the cadence titles
// seeded by migration 0102_update_customers_status_10_steps_kanban and the
// `status` selectValues on the customers collection — it drives both the
// Kanban columns and the status filter dropdown. The old D0–D9 "Follow up"
// stages were legacy and left the pipeline "desconfigurada": customers in
// statuses like "Validação no CRM" had no Kanban column and could not be
// moved/verified, and the filter dropdown did not offer the real statuses.
// 'Novo' is the entry bucket (it also groups `lead` and empty status via
// buildStageFilter); the remaining stages are the 10-step funnel.
export const CUSTOMER_STAGES = [
  'Novo',
  'Captura + Identificação',
  'Validação no CRM',
  'Contato Personalizado',
  'Mapeamento de Perfil',
  'Nutrição Automática',
  'Agendamento de Visita',
  'Pré-Visita',
  'Pós-Visita',
  'Proposta e Negociação',
  'Fechamento e Pós-Venda',
]

export const SOURCE_OPTIONS = ['Villa dos Açores', 'Google Ads', 'Meta Ads', 'Instagram', 'Website']
export const LEAD_PROFILE_OPTIONS = ['Investidor', 'Morador', 'Primeiro Imóvel', 'Veranista']

export interface CustomerFilterState {
  search: string
  source: string
  neighborhood: string
  leadProfile: string
  urgency: string
  noSend: boolean
  tags: string
}

export function escapeFilterValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function buildBaseFilter(filters: CustomerFilterState): string {
  const parts: string[] = []
  const q = filters.search.trim()
  if (q) {
    const safe = escapeFilterValue(q)
    parts.push(
      `(name ~ "${safe}" || first_name ~ "${safe}" || phone ~ "${safe}" || phone_1_value ~ "${safe}" || email ~ "${safe}" || email_1_value ~ "${safe}" || notes ~ "${safe}")`,
    )
  }
  if (filters.source && filters.source !== 'all') {
    parts.push(`source ~ "${escapeFilterValue(filters.source)}"`)
  }
  if (filters.neighborhood && filters.neighborhood.trim()) {
    parts.push(`neighborhood ~ "${escapeFilterValue(filters.neighborhood.trim())}"`)
  }
  if (filters.leadProfile && filters.leadProfile !== 'all') {
    parts.push(`lead_profile = "${escapeFilterValue(filters.leadProfile)}"`)
  }
  if (filters.urgency && filters.urgency !== 'all') {
    switch (filters.urgency) {
      case 'high':
        parts.push('urgency >= 7')
        break
      case 'medium':
        parts.push('urgency >= 4 && urgency <= 6')
        break
      case 'low':
        parts.push('urgency >= 1 && urgency <= 3')
        break
      case 'none':
        parts.push('urgency = 0')
        break
    }
  }
  if (filters.noSend) {
    parts.push(`(last_sent_at = null || last_sent_at = "")`)
  }
  if (filters.tags && filters.tags.trim()) {
    parts.push(`tags ~ "${escapeFilterValue(filters.tags.trim())}"`)
  }
  return parts.join(' && ')
}

// The 10 real pipeline stages (excludes the 'Novo' entry bucket). Used by
// buildStageFilter to express "Novo = everything that is not a pipeline stage".
const PIPELINE_STAGE_VALUES = CUSTOMER_STAGES.filter((s) => s !== 'Novo')

export function buildStageFilter(stage: string): string {
  if (stage === 'Novo') {
    // The entry bucket catches every status that is NOT one of the 10 pipeline
    // stages — i.e. genuine new leads ('Novo', 'lead', '', 'Lead Novo',
    // 'Base de Clientes/Novo LYD') AND any legacy status value (D0–D9 follow
    // ups, 'Qualificação', 'closed', …) that has no dedicated column. This
    // guarantees no customer is orphaned and every customer can be dragged
    // into the correct pipeline stage. (A migration normalizes the common
    // legacy values to their pipeline equivalent so the bucket stays small.)
    const notPipeline = PIPELINE_STAGE_VALUES.map(
      (s) => `status != "${escapeFilterValue(s)}"`,
    ).join(' && ')
    return `(${notPipeline})`
  }
  return `status = "${escapeFilterValue(stage)}"`
}

export function combineFilters(...parts: (string | undefined | null)[]): string {
  return parts.filter((p) => !!p && p.trim() !== '').join(' && ')
}

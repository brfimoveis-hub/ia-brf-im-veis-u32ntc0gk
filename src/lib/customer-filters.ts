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
  '1. Acolhimento',
  '2. Qualificação',
  '3. Apresentação Consultiva',
  '4. Sondagem Financeira',
  '5. Nutrição de Interesse',
  '6. Convite de Visita',
  '7. Confirmação e Rota',
  '8. Feedback da Visita',
  '9. Proposta e Condições',
  '10. Pós-venda e Indicação',
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
  // PocketBase filter strings: escape backslashes, single quotes and double quotes
  return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
}

export function buildBaseFilter(filters: CustomerFilterState): string {
  const parts: string[] = []
  const q = filters.search.trim()
  if (q) {
    const safe = escapeFilterValue(q)
    parts.push(
      `(name ~ '${safe}' || first_name ~ '${safe}' || phone ~ '${safe}' || phone_1_value ~ '${safe}' || email ~ '${safe}' || email_1_value ~ '${safe}' || notes ~ '${safe}')`,
    )
  }
  if (filters.source && filters.source !== 'all') {
    parts.push(`source ~ '${escapeFilterValue(filters.source)}'`)
  }
  if (filters.neighborhood && filters.neighborhood.trim()) {
    parts.push(`neighborhood ~ '${escapeFilterValue(filters.neighborhood.trim())}'`)
  }
  if (filters.leadProfile && filters.leadProfile !== 'all') {
    parts.push(`lead_profile = '${escapeFilterValue(filters.leadProfile)}'`)
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
    parts.push(`(last_sent_at = null || last_sent_at = '')`)
  }
  if (filters.tags && filters.tags.trim()) {
    parts.push(`tags ~ '${escapeFilterValue(filters.tags.trim())}'`)
  }
  return parts.join(' && ')
}

// Mapeamento retrocompatível para garantir que filtros por etapa encontrem tanto
// o estágio novo quanto eventuais valores legados na busca
const LEGACY_STAGE_ALIASES: Record<string, string[]> = {
  '1. Acolhimento': [
    '1. Acolhimento',
    'Novo',
    'lead',
    'Lead Novo',
    'Base de Clientes/Novo LYD',
    'Captura + Identificação',
    'D0 - Contato Imediato',
    'Contato Inicial',
    'contact',
  ],
  '2. Qualificação': ['2. Qualificação', 'Validação no CRM', 'Qualificação'],
  '3. Apresentação Consultiva': ['3. Apresentação Consultiva', 'Contato Personalizado'],
  '4. Sondagem Financeira': ['4. Sondagem Financeira', 'Mapeamento de Perfil'],
  '5. Nutrição de Interesse': [
    '5. Nutrição de Interesse',
    'Nutrição Automática',
    'Engajamento',
    'D1 - Follow up 1',
    'D2 - Follow up 2',
    'D3 - Follow up 3',
    'D4 - Follow up 4',
  ],
  '6. Convite de Visita': [
    '6. Convite de Visita',
    'Agendamento de Visita',
    'Demo Realiz.',
    'D5 - Follow up 5',
    'D6 - Follow up 6',
    'D7 - Follow up 7',
    'D8 - Follow up 8',
    'D9 - Despedida/Nutrição',
  ],
  '7. Confirmação e Rota': ['7. Confirmação e Rota', 'Pré-Visita'],
  '8. Feedback da Visita': ['8. Feedback da Visita', 'Pós-Visita', 'Visita'],
  '9. Proposta e Condições': ['9. Proposta e Condições', 'Proposta e Negociação', 'Proposta'],
  '10. Pós-venda e Indicação': [
    '10. Pós-venda e Indicação',
    'Fechamento e Pós-Venda',
    'Fechamento',
    'closed',
  ],
}

export function buildStageFilter(stage: string): string {
  const clean = stage.trim()
  if (!clean) return ''
  const aliases = LEGACY_STAGE_ALIASES[clean] || [clean]
  const statusConditions = aliases.map((val) => `status = '${escapeFilterValue(val)}'`).join(' || ')
  return `(${statusConditions})`
}

export function combineFilters(...parts: (string | undefined | null)[]): string {
  return parts.filter((p) => !!p && p.trim() !== '').join(' && ')
}

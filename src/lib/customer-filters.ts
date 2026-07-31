export const CUSTOMER_STAGES = [
  'Novo',
  'D0 - Contato Imediato',
  'D1 - Follow up 1',
  'D2 - Follow up 2',
  'D3 - Follow up 3',
  'D4 - Follow up 4',
  'D5 - Follow up 5',
  'D6 - Follow up 6',
  'D7 - Follow up 7',
  'D8 - Follow up 8',
  'D9 - Despedida/Nutrição',
  'Fechamento',
  'closed',
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

export function buildStageFilter(stage: string): string {
  if (stage === 'Novo') {
    return `(status = "Novo" || status = "lead" || status = "")`
  }
  return `status = "${escapeFilterValue(stage)}"`
}

export function combineFilters(...parts: (string | undefined | null)[]): string {
  return parts.filter((p) => !!p && p.trim() !== '').join(' && ')
}

import pb from '@/lib/pocketbase/client'

export interface BankFinancingData {
  bank_code: string
  bank_name: string
  min_down_payment_pct: number
  max_financing_pct: number
  rate_effective_annual_pct: number
  rate_details: string
  max_income_commitment_pct: number
  max_term_months: number
  fgts_accepted: boolean
  subsidy_applicable: boolean
  special_rules?: string
  source_detail?: string
  is_live_rate?: boolean
}

export interface FinancingMemo {
  id: string
  reference_date: string
  source: string
  source_url?: string
  banks_data: BankFinancingData[] | string
  summary_text: string
  is_partial: boolean
  missing_sources?: string[] | string
  created: string
  updated: string
}

export async function getLatestFinancingMemo(): Promise<FinancingMemo | null> {
  try {
    const records = await pb.collection('financing_memos').getList<FinancingMemo>(1, 1, {
      sort: '-created',
    })
    return records.items[0] || null
  } catch (err) {
    console.warn('[financing_memos] Falha ao buscar memo de financiamento:', err)
    return null
  }
}

export async function getFinancingMemos(limit = 10): Promise<FinancingMemo[]> {
  try {
    const records = await pb.collection('financing_memos').getList<FinancingMemo>(1, limit, {
      sort: '-created',
    })
    return records.items
  } catch (err) {
    console.warn('[financing_memos] Falha ao listar memos de financiamento:', err)
    return []
  }
}

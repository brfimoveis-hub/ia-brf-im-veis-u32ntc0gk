export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  status: string
  urgency: number
  neighborhood: string
  price_range: string
  created: string
  updated: string
  last_sent_at?: string
  credit_analysis_status?: 'nao_oferecido' | 'oferecido' | 'consentido' | 'recusado' | 'enviado'
  credit_analysis_offered_at?: string
  credit_analysis_consented_at?: string
}

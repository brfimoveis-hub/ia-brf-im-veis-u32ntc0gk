import type { Customer } from '@/services/customers'
import type { Cadence } from '@/services/cadences'
import type { EmailCampaign } from '@/services/email_campaigns'

function escapeCell(val: unknown): string {
  const s = String(val ?? '').replace(/"/g, '""')
  return `"${s}"`
}

function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportCustomersToCSV(customers: Customer[]): void {
  const headers = [
    'Nome',
    'Telefone',
    'Email',
    'Status',
    'Urgência',
    'Origem',
    'Bairro',
    'Último Envio',
    'Tags',
  ]

  const rows = customers.map((c) => [
    c.name || c.first_name || '',
    c.phone || c.phone_1_value || '',
    c.email || c.email_1_value || '',
    c.status || '',
    String(c.urgency ?? ''),
    c.source || '',
    c.neighborhood || '',
    c.last_sent_at || '',
    Array.isArray(c.tags) ? c.tags.join('; ') : '',
  ])

  downloadCSV(`clientes-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
}

export function exportCadencesToCSV(cadences: Cadence[]): void {
  const headers = ['Título', 'Descrição', 'Passo', 'Ativo', 'Conteúdo', 'Instruções IA']

  const rows = cadences.map((c) => [
    c.title || '',
    c.description || '',
    String(c.order ?? ''),
    c.is_active ? 'Sim' : 'Não',
    c.content || '',
    c.ai_instructions || '',
  ])

  downloadCSV(`cadencias-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
}

export function exportCampaignsToCSV(campaigns: EmailCampaign[]): void {
  const headers = ['Nome', 'Assunto', 'Status', 'Enviados', 'Abertos', 'Clicados', 'Falhas', 'Data']

  const rows = campaigns.map((c) => [
    c.name || '',
    c.subject || '',
    c.status || '',
    String(c.success_count || 0),
    String(c.unique_opens || 0),
    String(c.unique_clicks || 0),
    String(c.failure_count || 0),
    c.created || '',
  ])

  downloadCSV(`campanhas-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
}

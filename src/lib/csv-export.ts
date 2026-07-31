import type { Customer } from '@/services/customers'

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

  const escapeCell = (val: unknown): string => {
    const s = String(val ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const rows = customers.map((c) =>
    [
      c.name || c.first_name || '',
      c.phone || c.phone_1_value || '',
      c.email || c.email_1_value || '',
      c.status || '',
      c.urgency ?? '',
      c.source || '',
      c.neighborhood || '',
      c.last_sent_at || '',
      Array.isArray(c.tags) ? c.tags.join('; ') : '',
    ]
      .map(escapeCell)
      .join(','),
  )

  const csv = [headers.map(escapeCell).join(','), ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

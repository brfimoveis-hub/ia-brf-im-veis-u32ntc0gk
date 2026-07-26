export const PHASES = [
  {
    id: 'Novo',
    title: 'Lead',
    color: 'bg-slate-100',
    aliases: ['Novo', 'lead', 'Lead Novo', ''],
  },
  { id: 'Qualificação', title: 'Contact', color: 'bg-blue-100', aliases: ['Qualificação'] },
  {
    id: 'Engajamento',
    title: 'Engage',
    color: 'bg-indigo-100',
    aliases: ['Engajamento', 'contact'],
  },
  { id: 'Demo Realiz.', title: 'Schedule', color: 'bg-purple-100', aliases: ['Demo Realiz.'] },
  { id: 'Visita', title: 'Submit', color: 'bg-orange-100', aliases: ['Visita'] },
  {
    id: 'Fechamento',
    title: 'Purchase',
    color: 'bg-emerald-100',
    aliases: ['Fechamento', 'closed'],
  },
]

export const COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email_1_value', label: 'Email' },
  { key: 'source', label: 'Origem' },
  { key: 'tags', label: 'Tags' },
]

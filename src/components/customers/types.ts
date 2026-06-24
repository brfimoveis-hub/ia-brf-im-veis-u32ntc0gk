export interface Customer {
  id: string
  name: string
  phone: string
  status: string
  neighborhood: string
  price_range: string
  urgency: number
  created: string
}

export const STAGES = [
  {
    id: 'D0 - Contato Imediato',
    title: 'D0 - Contato Imediato',
    color: 'border-red-500',
    cardBorder: 'border-l-red-500',
    text: 'text-red-500',
    hover: 'hover:border-red-500',
    desc: 'Ação: Entrar em contato imediatamente após a chegada do lead. Meta: Qualificação inicial.',
  },
  {
    id: 'D1 - Follow up 1',
    title: 'D1 - Follow up 1',
    color: 'border-orange-500',
    cardBorder: 'border-l-orange-500',
    text: 'text-orange-500',
    hover: 'hover:border-orange-500',
    desc: 'Ação: Retomar o contato caso não tenha respondido no D0. Meta: Gerar resposta.',
  },
  {
    id: 'D2 - Follow up 2',
    title: 'D2 - Follow up 2',
    color: 'border-amber-500',
    cardBorder: 'border-l-amber-500',
    text: 'text-amber-500',
    hover: 'hover:border-amber-500',
    desc: 'Ação: Enviar material de valor ou prova social. Meta: Engajamento.',
  },
  {
    id: 'D3 - Follow up 3',
    title: 'D3 - Follow up 3',
    color: 'border-yellow-500',
    cardBorder: 'border-l-yellow-500',
    text: 'text-yellow-500',
    hover: 'hover:border-yellow-500',
    desc: 'Ação: Tentar abordagem por outro canal (ligação/email). Meta: Contato direto.',
  },
  {
    id: 'D4 - Follow up 4',
    title: 'D4 - Follow up 4',
    color: 'border-lime-500',
    cardBorder: 'border-l-lime-500',
    text: 'text-lime-500',
    hover: 'hover:border-lime-500',
    desc: 'Ação: Abordar com senso de urgência ou escassez. Meta: Reativar interesse.',
  },
  {
    id: 'D5 - Follow up 5',
    title: 'D5 - Follow up 5',
    color: 'border-green-500',
    cardBorder: 'border-l-green-500',
    text: 'text-green-500',
    hover: 'hover:border-green-500',
    desc: 'Ação: Validar se ainda faz sentido o contato. Meta: Agendar visita.',
  },
  {
    id: 'D6 - Follow up 6',
    title: 'D6 - Follow up 6',
    color: 'border-emerald-500',
    cardBorder: 'border-l-emerald-500',
    text: 'text-emerald-500',
    hover: 'hover:border-emerald-500',
    desc: 'Ação: Manter relacionamento próximo. Meta: Visita ou proposta.',
  },
  {
    id: 'D7 - Follow up 7',
    title: 'D7 - Follow up 7',
    color: 'border-teal-500',
    cardBorder: 'border-l-teal-500',
    text: 'text-teal-500',
    hover: 'hover:border-teal-500',
    desc: 'Ação: Nutrição com novidades do mercado. Meta: Retomada de negociação.',
  },
  {
    id: 'D8 - Follow up 8',
    title: 'D8 - Follow up 8',
    color: 'border-cyan-500',
    cardBorder: 'border-l-cyan-500',
    text: 'text-cyan-500',
    hover: 'hover:border-cyan-500',
    desc: 'Ação: Última tentativa ativa de conexão direta. Meta: Feedback claro.',
  },
  {
    id: 'D9 - Despedida/Nutrição',
    title: 'D9 - Despedida/Nutrição',
    color: 'border-gray-500',
    cardBorder: 'border-l-gray-500',
    text: 'text-gray-500',
    hover: 'hover:border-gray-500',
    desc: 'Ação: Mensagem de encerramento temporário. Meta: Deixar porta aberta para o futuro.',
  },
]

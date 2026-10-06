export interface Customer {
  id: string
  name: string
  phone: string
  status: string
  neighborhood: string
  price_range: string
  urgency: number
  created: string
  credit_analysis_status?: 'nao_oferecido' | 'oferecido' | 'consentido' | 'recusado' | 'enviado'
  credit_analysis_offered_at?: string
  credit_analysis_consented_at?: string
}

export const STAGES = [
  {
    id: '1. Acolhimento',
    title: '1. Acolhimento',
    stepNumber: 1,
    phase: 'Lead',
    color: 'border-blue-500',
    cardBorder: 'border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:border-blue-500',
    desc: 'Acolhimento caloroso e imediato, conexão inicial e validação do nome do cliente e do imóvel de interesse.',
  },
  {
    id: '2. Qualificação',
    title: '2. Qualificação',
    stepNumber: 2,
    phase: 'Atendimento',
    color: 'border-cyan-500',
    cardBorder: 'border-l-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    hover: 'hover:border-cyan-500',
    desc: 'Diálogo consultivo fluido mapeando localização preferida e faixa aproximada de investimento (uma pergunta por vez).',
  },
  {
    id: '3. Apresentação Consultiva',
    title: '3. Apresentação Consultiva',
    stepNumber: 3,
    phase: 'Atendimento',
    color: 'border-teal-500',
    cardBorder: 'border-l-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    hover: 'hover:border-teal-500',
    desc: 'Apresentação envolvente do imóvel em foco (estilo de vida e diferenciais) gerando curiosidade antes de abrir preços e links.',
  },
  {
    id: '4. Sondagem Financeira',
    title: '4. Sondagem Financeira',
    stepNumber: 4,
    phase: 'Atendimento',
    color: 'border-indigo-500',
    cardBorder: 'border-l-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    hover: 'hover:border-indigo-500',
    desc: 'Qualificação de perfil e condições de pagamento: morador/investidor, à vista, financiamento bancário, FGTS ou permuta.',
  },
  {
    id: '5. Nutrição de Interesse',
    title: '5. Nutrição de Interesse',
    stepNumber: 5,
    phase: 'Atendimento',
    color: 'border-amber-500',
    cardBorder: 'border-l-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    hover: 'hover:border-amber-500',
    desc: 'Manutenção ativa de contato com novos ângulos do dossiê, evolução das obras, plantas e valorização do m².',
  },
  {
    id: '6. Convite de Visita',
    title: '6. Convite de Visita',
    stepNumber: 6,
    phase: 'Visita',
    color: 'border-orange-500',
    cardBorder: 'border-l-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    hover: 'hover:border-orange-500',
    desc: 'Conversão do interesse em experiência presencial no imóvel ou estande com técnica de opções (sexta à tarde ou sábado de manhã).',
  },
  {
    id: '7. Confirmação e Rota',
    title: '7. Confirmação e Rota',
    stepNumber: 7,
    phase: 'Visita',
    color: 'border-rose-500',
    cardBorder: 'border-l-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    hover: 'hover:border-rose-500',
    desc: 'Confirmação prévia de presença, orientações de rota e localização exata garantindo o comparecimento com segurança.',
  },
  {
    id: '8. Feedback da Visita',
    title: '8. Feedback da Visita',
    stepNumber: 8,
    phase: 'Visita',
    color: 'border-purple-500',
    cardBorder: 'border-l-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    hover: 'hover:border-purple-500',
    desc: 'Coleta de impressões pós-visita: identificação dos pontos altos que encantaram e esclarecimento do que faltou para decidir.',
  },
  {
    id: '9. Proposta e Condições',
    title: '9. Proposta e Condições',
    stepNumber: 9,
    phase: 'Proposta',
    color: 'border-emerald-500',
    cardBorder: 'border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    hover: 'hover:border-emerald-500',
    desc: 'Plano financeiro de aquisição, superação técnica de objeções (CAB e Ferir/Curar) e isolamento de condições.',
  },
  {
    id: '10. Pós-venda e Indicação',
    title: '10. Pós-venda e Indicação',
    stepNumber: 10,
    phase: 'Fechamento',
    color: 'border-green-600',
    cardBorder: 'border-l-green-600',
    text: 'text-green-700 dark:text-green-400',
    hover: 'hover:border-green-600',
    desc: 'Condução à assinatura de contrato, validação documental, acompanhamento da entrega das chaves e pedido de indicações.',
  },
]

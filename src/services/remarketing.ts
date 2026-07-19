import pb from '@/lib/pocketbase/client'

export interface RemarketingPreferences {
  enabledStatuses: string[]
  audienceMappings: Record<string, string>
  autoSync: boolean
}

export const DEFAULT_PREFERENCES: RemarketingPreferences = {
  enabledStatuses: [],
  audienceMappings: {},
  autoSync: false,
}

export const CUSTOMER_STATUSES: string[] = [
  'Novo',
  'lead',
  'Captura + Identificação',
  'Validação no CRM',
  'Contato Inicial',
  'Contato Personalizado',
  'Mapeamento de Perfil',
  'Qualificação',
  'Engajamento',
  'Nutrição Automática',
  'Agendamento de Visita',
  'Pré-Visita',
  'Visita',
  'Pós-Visita',
  'Demo Realiz.',
  'Proposta',
  'Proposta e Negociação',
  'Fechamento',
  'Fechamento e Pós-Venda',
  'closed',
  'contact',
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
]

export const getRemarketingPreferences = async (
  userId: string,
): Promise<RemarketingPreferences> => {
  try {
    const user = await pb.collection('users').getOne(userId)
    const raw = (user as any).project_data
    const projectData = typeof raw === 'string' ? JSON.parse(raw) : raw || {}
    return { ...DEFAULT_PREFERENCES, ...(projectData.remarketing || {}) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export const saveRemarketingPreferences = async (userId: string, prefs: RemarketingPreferences) => {
  const user = await pb.collection('users').getOne(userId)
  const raw = (user as any).project_data
  const projectData = typeof raw === 'string' ? JSON.parse(raw) : raw || {}
  projectData.remarketing = prefs
  return pb.collection('users').update(userId, { project_data: projectData })
}

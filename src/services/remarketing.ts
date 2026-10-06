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

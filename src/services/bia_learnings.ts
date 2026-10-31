import pb from '@/lib/pocketbase/client'

export type BiaLearningCategory =
  | 'catalogo'
  | 'comportamento'
  | 'qualificacao'
  | 'apresentacao'
  | 'geral'

export type BiaLearningType = 'ERRO' | 'ACERTO' | 'OBJECOES' | 'DUVIDA_SEM_RESPOSTA' | 'DIRETRIZ'

export type BiaLearningOrigin = 'auto' | 'seed_expert' | 'manual' | 'cron_semanal'

export type BiaLearningStatus = 'aprovado' | 'pendente' | 'descartado' | 'em_revisao'

export interface BiaLearning {
  id: string
  user_id?: string
  title: string
  rule_text: string
  category: BiaLearningCategory
  learning_type?: BiaLearningType
  origin?: BiaLearningOrigin
  status?: BiaLearningStatus
  context_customer?: string
  context_property?: string
  conflict_flag?: string
  author: string
  is_active: boolean
  priority: number
  last_reviewed_at?: string
  reviewed_by?: string
  created: string
  updated: string
}

export type CreateBiaLearningPayload = {
  title: string
  rule_text: string
  category?: BiaLearningCategory
  learning_type?: BiaLearningType
  origin?: BiaLearningOrigin
  status?: BiaLearningStatus
  context_customer?: string
  context_property?: string
  conflict_flag?: string
  author?: string
  is_active?: boolean
  priority?: number
  user_id?: string
}

export type UpdateBiaLearningPayload = Partial<CreateBiaLearningPayload> & {
  last_reviewed_at?: string
  reviewed_by?: string
}

export const getBiaLearnings = async (userId?: string): Promise<BiaLearning[]> => {
  // O caderno de aprendizados e lições semente pertencem ao sistema/Mauro (algumas têm user_id do Mauro, outras vazias, outras de admin).
  // Retornamos todas as lições acessíveis (ou com filtro aberto para incluir sem user_id)
  const currentUserId = userId || pb.authStore.record?.id
  const filter = currentUserId
    ? `user_id = "${currentUserId}" || user_id = "" || origin = "seed_expert" || origin = "cron_semanal" || origin = "auto"`
    : ''

  const records = await pb.collection('bia_learnings').getFullList<BiaLearning>({
    filter: filter || undefined,
    sort: '-priority,-created',
  })
  return records
}

export const createBiaLearning = async (
  payload: CreateBiaLearningPayload,
): Promise<BiaLearning> => {
  const currentUserId = payload.user_id || pb.authStore.record?.id
  const now = new Date().toISOString()
  return pb.collection('bia_learnings').create<BiaLearning>({
    ...payload,
    category: payload.category || 'geral',
    author: payload.author || 'Mauro',
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    priority: payload.priority ?? 50,
    user_id: currentUserId,
    last_reviewed_at: now,
    reviewed_by: payload.author || 'Mauro',
  })
}

export const updateBiaLearning = async (
  id: string,
  payload: UpdateBiaLearningPayload,
): Promise<BiaLearning> => {
  return pb.collection('bia_learnings').update<BiaLearning>(id, payload)
}

export const toggleBiaLearningActive = async (
  id: string,
  isActive: boolean,
): Promise<BiaLearning> => {
  return pb.collection('bia_learnings').update<BiaLearning>(id, {
    is_active: isActive,
  })
}

export const markBiaLearningReviewed = async (
  id: string,
  reviewer = 'Mauro',
): Promise<BiaLearning> => {
  return pb.collection('bia_learnings').update<BiaLearning>(id, {
    last_reviewed_at: new Date().toISOString(),
    reviewed_by: reviewer,
  })
}

export const approveBiaLearning = async (id: string, reviewer = 'Mauro'): Promise<BiaLearning> => {
  return pb.collection('bia_learnings').update<BiaLearning>(id, {
    status: 'aprovado',
    is_active: true,
    last_reviewed_at: new Date().toISOString(),
    reviewed_by: reviewer,
  })
}

export const discardBiaLearning = async (id: string, reviewer = 'Mauro'): Promise<BiaLearning> => {
  return pb.collection('bia_learnings').update<BiaLearning>(id, {
    status: 'descartado',
    is_active: false,
    last_reviewed_at: new Date().toISOString(),
    reviewed_by: reviewer,
  })
}

export const triggerWeeklyReguaConsolidation = async (): Promise<{
  success: boolean
  message: string
  learning_id?: string
  title?: string
}> => {
  return pb.send<{
    success: boolean
    message: string
    learning_id?: string
    title?: string
  }>('/backend/v1/bia/consolidate_weekly_regua', {
    method: 'POST',
  })
}

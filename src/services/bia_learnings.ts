import pb from '@/lib/pocketbase/client'

export type BiaLearningCategory =
  | 'catalogo'
  | 'comportamento'
  | 'qualificacao'
  | 'apresentacao'
  | 'geral'

export interface BiaLearning {
  id: string
  user_id?: string
  title: string
  rule_text: string
  category: BiaLearningCategory
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
  const currentUserId = userId || pb.authStore.record?.id
  const filter = currentUserId ? `user_id = "${currentUserId}" || user_id = ""` : ''

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

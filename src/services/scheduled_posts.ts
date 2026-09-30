import pb from '@/lib/pocketbase/client'
import { assertCanUploadFiles } from './ai_knowledge_storage'

export type ScheduledPostStatus = 'rascunho' | 'agendado' | 'publicado' | 'falhou'

export interface ScheduledPost {
  id: string
  user_id?: string
  launch?: string
  caption: string
  images?: string[]
  scheduled_at: string
  status: ScheduledPostStatus
  error_message?: string
  published_at?: string
  link_cta?: string
  created_by?: string
  meta_media_id?: string
  meta_permalink?: string
  image_urls?: string[]
  created?: string
  updated?: string
  expand?: {
    launch?: {
      id: string
      name: string
      enterprise_name?: string
      slug?: string
      headline?: string
      images?: string[]
    }
  }
}

export interface CreateScheduledPostPayload {
  launch?: string
  caption: string
  scheduled_at: string
  status?: ScheduledPostStatus
  link_cta?: string
  image_files?: File[]
  image_urls?: string[]
  created_by?: string
}

export interface UpdateScheduledPostPayload {
  launch?: string
  caption?: string
  scheduled_at?: string
  status?: ScheduledPostStatus
  link_cta?: string
  image_files?: File[]
  image_urls?: string[]
  error_message?: string
  published_at?: string
}

export interface InstagramPublishStatusResponse {
  can_auto_publish: boolean
  mode: 'automatic' | 'manual_degraded'
  instagram_username: string
  instagram_business_id: string
  degraded_reason: string
}

export interface SuggestCaptionResponse {
  success: boolean
  caption: string
  launch_used?: string | null
}

export interface PublishNowResponse {
  success: boolean
  status?: ScheduledPostStatus
  message?: string
  degraded_mode?: boolean
  post?: {
    id: string
    status: ScheduledPostStatus
    published_at: string
    meta_permalink?: string
  }
}

/**
 * Busca a lista de posts agendados com ordenação por scheduled_at crescente ou decrescente
 */
export async function getScheduledPosts(
  filter?: string,
  sort = '-scheduled_at',
): Promise<ScheduledPost[]> {
  try {
    const records = await pb.collection('scheduled_posts').getFullList<ScheduledPost>({
      filter: filter || '',
      sort: sort,
      expand: 'launch',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar scheduled_posts:', err)
    return []
  }
}

/**
 * Retorna um post específico pelo ID
 */
export async function getScheduledPostById(id: string): Promise<ScheduledPost | null> {
  try {
    return await pb.collection('scheduled_posts').getOne<ScheduledPost>(id, {
      expand: 'launch',
    })
  } catch (err) {
    console.error(`Erro ao buscar scheduled_post ${id}:`, err)
    return null
  }
}

/**
 * Cria um novo post respeitando a cota da Bia para upload de imagens
 */
/**
 * Sanitiza o ID do lançamento vinculado.
 * PocketBase recusa strings inválidas ou "none" em campos de relação.
 * Retorna string vazia ou undefined quando não há lançamento vinculado.
 */
function sanitizeLaunchId(launch?: string | null): string | null {
  if (!launch) return null
  const trimmed = launch.trim()
  if (!trimmed || trimmed === 'none' || trimmed === 'null' || trimmed === 'undefined') {
    return null
  }
  return trimmed
}

/**
 * Sanitiza a data de agendamento para formato ISO padrão aceito pelo PocketBase (UTC ISO 8601).
 * Aceita "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm", timestamp, etc.
 */
function sanitizeScheduledDate(dateInput: string): string {
  if (!dateInput || !dateInput.trim()) {
    return new Date().toISOString()
  }

  const trimmed = dateInput.trim()

  // Se já for ISO com Z ou offset, tenta parsear
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  // Tentar normalizar formato "YYYY-MM-DD HH:mm:ss" ou "YYYY-MM-DD HH:mm"
  const normalized = trimmed.replace(' ', 'T')
  const dateObj = new Date(normalized)
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString()
  }

  // Fallback seguro
  return new Date().toISOString()
}

/**
 * Recupera o ID do usuário atualmente autenticado com fallback para record ou model
 */
function getCurrentAuthUserId(): string | undefined {
  const record = (pb.authStore as any).record
  if (record && record.id) return record.id
  const model = pb.authStore.model
  if (model && model.id) return model.id
  return undefined
}

/**
 * Recupera o identificador legível do usuário autenticado (email ou nome)
 */
function getCurrentAuthUserLabel(): string {
  const record = (pb.authStore as any).record
  if (record && (record.email || record.name)) return record.email || record.name
  const model = pb.authStore.model
  if (model && (model.email || (model as any).name)) return model.email || (model as any).name
  return 'Mauro'
}

export async function createScheduledPost(
  payload: CreateScheduledPostPayload,
): Promise<ScheduledPost> {
  const currentUserId = getCurrentAuthUserId()
  const sanitizedLaunch = sanitizeLaunchId(payload.launch)
  const sanitizedDate = sanitizeScheduledDate(payload.scheduled_at)

  // 1. Validar cota de armazenamento se arquivos forem enviados
  if (payload.image_files && payload.image_files.length > 0) {
    await assertCanUploadFiles(payload.image_files, undefined, currentUserId)
  }

  // 2. Montar FormData se houver arquivos binários, ou JSON simples
  if (payload.image_files && payload.image_files.length > 0) {
    const formData = new FormData()
    if (currentUserId) formData.append('user_id', currentUserId)
    if (sanitizedLaunch) formData.append('launch', sanitizedLaunch)
    formData.append('caption', payload.caption || '')
    formData.append('scheduled_at', sanitizedDate)
    formData.append('status', payload.status || 'agendado')
    if (payload.link_cta) formData.append('link_cta', payload.link_cta)
    formData.append('created_by', payload.created_by || getCurrentAuthUserLabel())
    if (payload.image_urls && payload.image_urls.length > 0) {
      formData.append('image_urls', JSON.stringify(payload.image_urls))
    }

    for (const file of payload.image_files) {
      formData.append('images', file)
    }

    return await pb.collection('scheduled_posts').create<ScheduledPost>(formData, {
      expand: 'launch',
    })
  }

  const recordData: Record<string, any> = {
    caption: payload.caption || '',
    scheduled_at: sanitizedDate,
    status: payload.status || 'agendado',
    link_cta: payload.link_cta || '',
    created_by: payload.created_by || getCurrentAuthUserLabel(),
    image_urls: payload.image_urls || [],
  }

  if (currentUserId) {
    recordData.user_id = currentUserId
  }

  if (sanitizedLaunch) {
    recordData.launch = sanitizedLaunch
  }

  return await pb.collection('scheduled_posts').create<ScheduledPost>(recordData, {
    expand: 'launch',
  })
}

/**
 * Atualiza um post existente
 */
export async function updateScheduledPost(
  id: string,
  payload: UpdateScheduledPostPayload,
): Promise<ScheduledPost> {
  const currentUserId = getCurrentAuthUserId()
  const hasLaunchField = payload.launch !== undefined
  const sanitizedLaunch = hasLaunchField ? sanitizeLaunchId(payload.launch) : undefined
  const sanitizedDate =
    payload.scheduled_at !== undefined ? sanitizeScheduledDate(payload.scheduled_at) : undefined

  if (payload.image_files && payload.image_files.length > 0) {
    await assertCanUploadFiles(payload.image_files, undefined, currentUserId)
    const formData = new FormData()
    if (hasLaunchField) {
      // Se nulo ou vazio, omitir ou enviar vazio para limpar a relação no PB
      formData.append('launch', sanitizedLaunch || '')
    }
    if (payload.caption !== undefined) formData.append('caption', payload.caption)
    if (sanitizedDate !== undefined) formData.append('scheduled_at', sanitizedDate)
    if (payload.status !== undefined) formData.append('status', payload.status)
    if (payload.link_cta !== undefined) formData.append('link_cta', payload.link_cta)
    if (payload.error_message !== undefined) formData.append('error_message', payload.error_message)
    if (payload.published_at !== undefined) formData.append('published_at', payload.published_at)
    if (payload.image_urls !== undefined)
      formData.append('image_urls', JSON.stringify(payload.image_urls))

    for (const file of payload.image_files) {
      formData.append('images', file)
    }

    return await pb.collection('scheduled_posts').update<ScheduledPost>(id, formData, {
      expand: 'launch',
    })
  }

  const cleanData: Record<string, any> = {}
  if (hasLaunchField) cleanData.launch = sanitizedLaunch || null
  if (payload.caption !== undefined) cleanData.caption = payload.caption
  if (sanitizedDate !== undefined) cleanData.scheduled_at = sanitizedDate
  if (payload.status !== undefined) cleanData.status = payload.status
  if (payload.link_cta !== undefined) cleanData.link_cta = payload.link_cta
  if (payload.error_message !== undefined) cleanData.error_message = payload.error_message
  if (payload.published_at !== undefined) cleanData.published_at = payload.published_at
  if (payload.image_urls !== undefined) cleanData.image_urls = payload.image_urls

  return await pb.collection('scheduled_posts').update<ScheduledPost>(id, cleanData, {
    expand: 'launch',
  })
}

/**
 * Exclui um post
 */
export async function deleteScheduledPost(id: string): Promise<boolean> {
  try {
    await pb.collection('scheduled_posts').delete(id)
    return true
  } catch (err) {
    console.error(`Erro ao excluir post ${id}:`, err)
    return false
  }
}

/**
 * Duplica um post para facilitar replicação em datas futuras
 */
export async function duplicateScheduledPost(
  post: ScheduledPost,
  newDateStr?: string,
): Promise<ScheduledPost> {
  const targetDate = newDateStr || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // amanhã mesmo horário

  const newPayload: CreateScheduledPostPayload = {
    launch: sanitizeLaunchId(post.launch) || undefined,
    caption: post.caption,
    scheduled_at: targetDate,
    status: 'agendado',
    link_cta: post.link_cta,
    image_urls: post.image_urls || [],
    created_by: getCurrentAuthUserLabel(),
  }

  // Se tiver imagens nativas no PB, copia a referência de URLs públicas
  if (post.images && post.images.length > 0) {
    const pbBaseUrl = pb.baseUrl
    const existingFileUrls = post.images.map(
      (img) => `${pbBaseUrl}/api/files/scheduled_posts/${post.id}/${encodeURIComponent(img)}`,
    )
    newPayload.image_urls = [...(newPayload.image_urls || []), ...existingFileUrls]
  }

  return await createScheduledPost(newPayload)
}

/**
 * Dispara publicação imediata no Instagram via endpoint backend
 */
export async function publishPostNow(id: string): Promise<PublishNowResponse> {
  return await pb.send<PublishNowResponse>(`/backend/v1/posts/${id}/publish_now`, {
    method: 'POST',
  })
}

/**
 * Marca manualmente um post como publicado
 */
export async function markPostAsManuallyPublished(id: string): Promise<ScheduledPost> {
  const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19)
  return await updateScheduledPost(id, {
    status: 'publicado',
    published_at: nowIso,
    error_message: '',
  })
}

/**
 * Solicita à Bia (IA do CRM) a sugestão de legenda para post
 */
export async function suggestPostCaptionWithBia(
  launchId?: string,
  prompt?: string,
  tone?: string,
): Promise<SuggestCaptionResponse> {
  return await pb.send<SuggestCaptionResponse>('/backend/v1/posts/suggest_caption', {
    method: 'POST',
    body: JSON.stringify({
      launch_id: launchId || '',
      prompt: prompt || '',
      tone: tone || 'engajador',
    }),
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Consulta status de autorização do Instagram para o banner
 */
export async function getInstagramPostStatus(): Promise<InstagramPublishStatusResponse> {
  try {
    return await pb.send<InstagramPublishStatusResponse>('/backend/v1/posts/instagram_status', {
      method: 'GET',
    })
  } catch (err) {
    console.warn('Erro ao consultar status do Instagram:', err)
    return {
      can_auto_publish: false,
      mode: 'manual_degraded',
      instagram_username: 'mauro.brfimoveis',
      instagram_business_id: '',
      degraded_reason: 'Não foi possível verificar status da API da Meta.',
    }
  }
}

/**
 * Constrói URL pública de visualização de imagem de post ou de lançamento
 */
export function getPostImageUrl(post: ScheduledPost, imageIndex = 0): string {
  if (post.images && post.images.length > imageIndex && post.images[imageIndex]) {
    return `${pb.baseUrl}/api/files/scheduled_posts/${post.id}/${encodeURIComponent(post.images[imageIndex])}`
  }
  if (post.image_urls && post.image_urls.length > imageIndex && post.image_urls[imageIndex]) {
    return post.image_urls[imageIndex]
  }
  return ''
}

/**
 * Constrói URL de imagem de um lançamento (se selecionado)
 */
export function getLaunchImageUrl(launchId: string, filename: string): string {
  return `${pb.baseUrl}/api/files/launches/${launchId}/${encodeURIComponent(filename)}`
}

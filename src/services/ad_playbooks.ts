import pb from '@/lib/pocketbase/client'

export interface AdPlaybook {
  id: string
  user_id?: string
  name: string
  match_keywords: string[]
  empreendimento: string
  pitch: string
  objective: string
  qualifying_questions: string
  cta_message: string
  active: boolean
  created: string
  updated: string
}

export type CreateAdPlaybookPayload = Omit<AdPlaybook, 'id' | 'created' | 'updated'>
export type UpdateAdPlaybookPayload = Partial<CreateAdPlaybookPayload>

/**
 * Busca todos os playbooks cadastrados
 */
export async function getAdPlaybooks(): Promise<AdPlaybook[]> {
  const records = await pb.collection('ad_playbooks').getFullList({
    sort: '-created',
  })
  return records.map((r) => {
    let kw: string[] = []
    if (Array.isArray(r.match_keywords)) {
      kw = r.match_keywords
    } else if (typeof r.match_keywords === 'string') {
      try {
        kw = JSON.parse(r.match_keywords)
      } catch (_) {
        kw = [r.match_keywords]
      }
    }
    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name || '',
      match_keywords: kw,
      empreendimento: r.empreendimento || '',
      pitch: r.pitch || '',
      objective: r.objective || '',
      qualifying_questions: r.qualifying_questions || '',
      cta_message: r.cta_message || '',
      active: r.active !== false,
      created: r.created,
      updated: r.updated,
    }
  })
}

/**
 * Busca um playbook por ID
 */
export async function getAdPlaybook(id: string): Promise<AdPlaybook> {
  const r = await pb.collection('ad_playbooks').getOne(id)
  let kw: string[] = []
  if (Array.isArray(r.match_keywords)) {
    kw = r.match_keywords
  } else if (typeof r.match_keywords === 'string') {
    try {
      kw = JSON.parse(r.match_keywords)
    } catch (_) {
      kw = [r.match_keywords]
    }
  }
  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name || '',
    match_keywords: kw,
    empreendimento: r.empreendimento || '',
    pitch: r.pitch || '',
    objective: r.objective || '',
    qualifying_questions: r.qualifying_questions || '',
    cta_message: r.cta_message || '',
    active: r.active !== false,
    created: r.created,
    updated: r.updated,
  }
}

/**
 * Cria um novo playbook
 */
export async function createAdPlaybook(payload: CreateAdPlaybookPayload): Promise<AdPlaybook> {
  const record = await pb.collection('ad_playbooks').create({
    ...payload,
    user_id: payload.user_id || pb.authStore.record?.id || '',
    match_keywords: payload.match_keywords,
    active: payload.active !== false,
  })
  return getAdPlaybook(record.id)
}

/**
 * Atualiza um playbook existente
 */
export async function updateAdPlaybook(
  id: string,
  payload: UpdateAdPlaybookPayload,
): Promise<AdPlaybook> {
  const record = await pb.collection('ad_playbooks').update(id, {
    ...payload,
  })
  return getAdPlaybook(record.id)
}

/**
 * Deleta um playbook
 */
export async function deleteAdPlaybook(id: string): Promise<boolean> {
  await pb.collection('ad_playbooks').delete(id)
  return true
}

/**
 * Alterna status ativo/inativo
 */
export async function toggleAdPlaybookActive(id: string, active: boolean): Promise<AdPlaybook> {
  return updateAdPlaybook(id, { active })
}

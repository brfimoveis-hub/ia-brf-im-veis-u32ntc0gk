import pb from '@/lib/pocketbase/client'

export interface WhatsAppTemplateButton {
  type?: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL'
  text: string
  url?: string
  phone_number?: string
}

export interface WhatsAppTemplate {
  id: string
  user_id: string
  name: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  body_text: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED'
  rejection_reason?: string
  meta_template_id?: string
  buttons?: WhatsAppTemplateButton[]
  example_values?: string[]
  created: string
  updated: string
  imported?: boolean
}

export interface CreateTemplatePayload {
  name: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  body_text: string
  buttons?: { text: string }[]
  example_values?: string[]
}

export interface CreateTemplateResponse {
  success: boolean
  id?: string
  name: string
  meta_template_id?: string
  status: string
  rejection_reason?: string
  message: string
  error?: string
}

export interface SyncTemplatesResponse {
  success: boolean
  total_meta: number
  templates: WhatsAppTemplate[]
  error?: string
}

/**
 * Busca os templates armazenados localmente na coleção PocketBase
 */
export async function getLocalWhatsAppTemplates(userId?: string): Promise<WhatsAppTemplate[]> {
  const filter = userId ? `user_id = "${userId}"` : ''
  const records = await pb.collection('whatsapp_templates').getFullList({
    filter,
    sort: '-created',
  })
  return records as unknown as WhatsAppTemplate[]
}

/**
 * Envia um novo template para aprovação na Meta Cloud API e salva localmente
 */
export async function submitTemplateToMeta(
  payload: CreateTemplatePayload,
): Promise<CreateTemplateResponse> {
  const token = pb.authStore.token
  const res = await fetch(`${pb.baseUrl}/backend/v1/whatsapp-templates/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(pb.authStore.record?.id ? { 'x-user-id': pb.authStore.record.id } : {}),
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Erro ${res.status} ao submeter template para a Meta`)
  }
  return json
}

/**
 * Consulta a Meta Cloud API para sincronizar o status ao vivo de todos os templates
 */
export async function syncTemplatesWithMeta(): Promise<SyncTemplatesResponse> {
  const token = pb.authStore.token
  const res = await fetch(`${pb.baseUrl}/backend/v1/whatsapp-templates/sync`, {
    method: 'GET',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(pb.authStore.record?.id ? { 'x-user-id': pb.authStore.record.id } : {}),
    },
  })

  const json = await res.json()
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Erro ${res.status} ao sincronizar templates com a Meta`)
  }
  return json
}

/**
 * Deleta um template na Meta e no banco local
 */
export async function deleteWhatsAppTemplate(templateId: string, name: string): Promise<boolean> {
  const token = pb.authStore.token
  const res = await fetch(`${pb.baseUrl}/backend/v1/whatsapp-templates/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(pb.authStore.record?.id ? { 'x-user-id': pb.authStore.record.id } : {}),
    },
    body: JSON.stringify({ id: templateId, name }),
  })

  const json = await res.json()
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Erro ${res.status} ao excluir template`)
  }
  return true
}

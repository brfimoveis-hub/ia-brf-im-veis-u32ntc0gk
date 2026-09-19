import pb from '@/lib/pocketbase/client'

export interface LaunchUnit {
  id: string
  typology: string
  area: string
  price: string
  available?: boolean
  notes?: string
}

export interface LaunchLandingTheme {
  primaryColor?: string
  accentColor?: string
  badgeText?: string
}

export interface Launch {
  id: string
  collectionId?: string
  collectionName?: string
  user_id?: string
  name: string
  slug: string
  enterprise_name: string
  status: 'rascunho' | 'em_revisao' | 'publicado' | 'arquivado'
  headline?: string
  description?: string
  units?: LaunchUnit[]
  payment_terms?: string
  differentials?: string[]
  sales_arguments?: string
  specific_cadence?: string
  keywords?: string[]
  location?: string
  landing_theme?: LaunchLandingTheme
  cta_whatsapp_number?: string
  cta_default_message?: string
  raw_material?: string
  images?: string[]
  attachments?: string[]
  created?: string
  updated?: string
}

export interface BiaMaeChatResponse {
  reply: string
  suggested_dossier?: (Partial<Launch> & { suggest_ready_for_review?: boolean }) | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function getLaunches(): Promise<Launch[]> {
  const records = await pb.collection('launches').getFullList<Launch>({
    sort: '-created',
  })
  return records
}

export async function getLaunchById(id: string): Promise<Launch> {
  const record = await pb.collection('launches').getOne<Launch>(id)
  return record
}

export async function getLaunchBySlug(slug: string): Promise<Launch | null> {
  try {
    const record = await pb.collection('launches').getFirstListItem<Launch>(`slug = "${slug}"`)
    return record
  } catch (e) {
    console.warn(`Lançamento não encontrado para o slug: ${slug}`, e)
    return null
  }
}

export async function createLaunch(data: Partial<Launch>): Promise<Launch> {
  const record = await pb.collection('launches').create<Launch>(data)
  return record
}

export async function updateLaunch(id: string, data: Partial<Launch> | FormData): Promise<Launch> {
  const record = await pb.collection('launches').update<Launch>(id, data)
  return record
}

export async function deleteLaunch(id: string): Promise<boolean> {
  return await pb.collection('launches').delete(id)
}

export async function publishLaunch(id: string): Promise<{ success: boolean; message: string }> {
  const res = await pb.send<{ success: boolean; message: string }>(
    `/backend/v1/launches/${id}/publish`,
    {
      method: 'POST',
    },
  )
  return res
}

export async function chatWithBiaMae(payload: {
  message: string
  launch_id?: string
  history?: ChatMessage[]
}): Promise<BiaMaeChatResponse> {
  const res = await pb.send<BiaMaeChatResponse>('/backend/v1/bia-mae/chat', {
    method: 'POST',
    body: payload,
  })
  return res
}

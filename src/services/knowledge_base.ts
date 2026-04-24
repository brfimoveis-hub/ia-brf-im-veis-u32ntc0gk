import pb from '@/lib/pocketbase/client'

export interface KnowledgeBaseEntry {
  id: string
  collectionId: string
  collectionName: string
  user_id: string
  title?: string
  content?: string
  category?: string
  site?: string
  tags?: string
  ai_instructions?: string
  attachments?: string[]
  created: string
  updated: string
}

export const getKnowledgeBaseEntries = () =>
  pb.collection('knowledge_base').getFullList<KnowledgeBaseEntry>({ sort: '-created' })

export const getFirstKnowledgeBaseEntry = async (userId: string) => {
  try {
    return await pb
      .collection('knowledge_base')
      .getFirstListItem<KnowledgeBaseEntry>(`user_id = "${userId}"`, {
        sort: '-created',
      })
  } catch (err: any) {
    if (err.status === 404) return null
    throw err
  }
}

export const createKnowledgeBaseEntry = (data: Partial<KnowledgeBaseEntry>) =>
  pb.collection('knowledge_base').create<KnowledgeBaseEntry>(data)

export const updateKnowledgeBaseEntry = (id: string, data: Partial<KnowledgeBaseEntry>) =>
  pb.collection('knowledge_base').update<KnowledgeBaseEntry>(id, data)

export const deleteKnowledgeBaseEntry = (id: string) => pb.collection('knowledge_base').delete(id)

import pb from '@/lib/pocketbase/client'

export interface KnowledgeBaseEntry {
  id: string
  user_id: string
  title?: string
  content?: string
  category?: string
  site?: string
  tags?: string
  ai_instructions?: string
  created: string
  updated: string
}

export const getKnowledgeBaseEntries = () =>
  pb.collection('knowledge_base').getFullList<KnowledgeBaseEntry>({ sort: '-created' })

export const createKnowledgeBaseEntry = (data: Partial<KnowledgeBaseEntry>) =>
  pb.collection('knowledge_base').create<KnowledgeBaseEntry>(data)

export const updateKnowledgeBaseEntry = (id: string, data: Partial<KnowledgeBaseEntry>) =>
  pb.collection('knowledge_base').update<KnowledgeBaseEntry>(id, data)

export const deleteKnowledgeBaseEntry = (id: string) => pb.collection('knowledge_base').delete(id)

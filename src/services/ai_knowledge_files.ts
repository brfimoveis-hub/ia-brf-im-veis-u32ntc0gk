import pb from '@/lib/pocketbase/client'

export interface AiKnowledgeFile {
  id: string
  collectionId: string
  collectionName: string
  user_id: string
  name: string
  file: string
  file_size?: number
  mime_type?: string
  extracted_text?: string
  summary?: string
  is_active: boolean
  created: string
  updated: string
}

export async function getAiKnowledgeFiles(userId?: string): Promise<AiKnowledgeFile[]> {
  const filter = userId ? `user_id = "${userId}"` : ''
  return await pb.collection('ai_knowledge_files').getFullList<AiKnowledgeFile>({
    filter,
    sort: '-created',
  })
}

export async function uploadAiKnowledgeFile(
  file: File,
  userId: string,
  customName?: string,
): Promise<AiKnowledgeFile> {
  const formData = new FormData()
  formData.append('user_id', userId)
  formData.append('name', customName || file.name)
  formData.append('file', file)
  formData.append('file_size', String(file.size))
  formData.append('mime_type', file.type || 'application/octet-stream')
  formData.append('is_active', 'true')

  return await pb.collection('ai_knowledge_files').create<AiKnowledgeFile>(formData)
}

export async function uploadMultipleAiKnowledgeFiles(
  files: File[],
  userId: string,
): Promise<AiKnowledgeFile[]> {
  const results: AiKnowledgeFile[] = []
  for (const file of files) {
    const uploaded = await uploadAiKnowledgeFile(file, userId)
    results.push(uploaded)
  }
  return results
}

export async function deleteAiKnowledgeFile(id: string): Promise<boolean> {
  return await pb.collection('ai_knowledge_files').delete(id)
}

export async function toggleAiKnowledgeFileActive(
  id: string,
  isActive: boolean,
): Promise<AiKnowledgeFile> {
  return await pb.collection('ai_knowledge_files').update<AiKnowledgeFile>(id, {
    is_active: isActive,
  })
}

export function getAiKnowledgeFileUrl(record: AiKnowledgeFile): string {
  return pb.files.getURL(record, record.file)
}

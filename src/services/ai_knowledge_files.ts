import pb from '@/lib/pocketbase/client'

export const MAX_AI_KNOWLEDGE_FILE_SIZE = 100 * 1024 * 1024 // 100 MB em bytes
export const MAX_AI_KNOWLEDGE_FILE_SIZE_LABEL = '100 MB'

export interface AiKnowledgeFile {
  id: string
  collectionId: string
  collectionName: string
  user_id: string
  name: string
  enterprise?: string
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
  enterprise?: string,
): Promise<AiKnowledgeFile> {
  if (file.size > MAX_AI_KNOWLEDGE_FILE_SIZE) {
    throw new Error(
      `O arquivo excede o limite máximo permitido de ${MAX_AI_KNOWLEDGE_FILE_SIZE_LABEL}.`,
    )
  }

  const formData = new FormData()
  formData.append('user_id', userId)
  formData.append('name', customName || file.name)
  if (enterprise && enterprise.trim()) {
    formData.append('enterprise', enterprise.trim())
  }
  formData.append('file', file)
  formData.append('file_size', String(file.size))
  formData.append('mime_type', file.type || 'application/octet-stream')
  formData.append('is_active', 'true')

  return await pb.collection('ai_knowledge_files').create<AiKnowledgeFile>(formData)
}

export async function updateAiKnowledgeFile(
  id: string,
  data: Partial<Pick<AiKnowledgeFile, 'name' | 'enterprise' | 'is_active'>>,
): Promise<AiKnowledgeFile> {
  return await pb.collection('ai_knowledge_files').update<AiKnowledgeFile>(id, data)
}

export async function uploadMultipleAiKnowledgeFiles(
  files: File[],
  userId: string,
  enterprise?: string,
): Promise<AiKnowledgeFile[]> {
  const results: AiKnowledgeFile[] = []
  for (const file of files) {
    const uploaded = await uploadAiKnowledgeFile(file, userId, undefined, enterprise)
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

import pb from '@/lib/pocketbase/client'

import {
  BIA_TOTAL_STORAGE_LIMIT_BYTES,
  BIA_TOTAL_STORAGE_LIMIT_LABEL,
  MAX_SINGLE_FILE_SIZE,
  MAX_SINGLE_FILE_SIZE_LABEL,
  assertCanUploadFiles,
} from './ai_knowledge_storage'

export const MAX_AI_KNOWLEDGE_FILE_SIZE = MAX_SINGLE_FILE_SIZE
export const MAX_AI_KNOWLEDGE_FILE_SIZE_LABEL = MAX_SINGLE_FILE_SIZE_LABEL
export const BIA_STORAGE_LIMIT_BYTES = BIA_TOTAL_STORAGE_LIMIT_BYTES
export const BIA_STORAGE_LIMIT_LABEL = BIA_TOTAL_STORAGE_LIMIT_LABEL

export interface AiKnowledgeFile {
  id: string
  collectionId: string
  collectionName: string
  user_id: string
  name: string
  enterprise?: string
  property_id?: string
  expand?: {
    property_id?: {
      id: string
      code: string
      title: string
      url?: string
      image_url?: string
      price_formatted?: string
      property_type?: string
      city?: string
      neighborhood?: string
    }
  }
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
    expand: 'property_id',
  })
}

export async function uploadAiKnowledgeFile(
  file: File,
  userId: string,
  customName?: string,
  enterprise?: string,
  currentUsedBytes?: number,
  propertyId?: string,
): Promise<AiKnowledgeFile> {
  // Valida limite individual e limite de cota total de 1 GB da Bia
  await assertCanUploadFiles([file], currentUsedBytes, userId)

  const formData = new FormData()
  formData.append('user_id', userId)
  formData.append('name', customName || file.name)
  if (enterprise && enterprise.trim()) {
    formData.append('enterprise', enterprise.trim())
  }
  if (propertyId && propertyId.trim()) {
    formData.append('property_id', propertyId.trim())
  }
  formData.append('file', file)
  formData.append('file_size', String(file.size))
  formData.append('mime_type', file.type || 'application/octet-stream')
  formData.append('is_active', 'true')

  try {
    return await pb.collection('ai_knowledge_files').create<AiKnowledgeFile>(formData)
  } catch (error: any) {
    // Tratamento de mensagens de erro específicas do PocketBase/servidor
    const message = error?.message || ''
    const status = error?.status || error?.statusCode
    if (
      status === 413 ||
      message.toLowerCase().includes('too large') ||
      message.toLowerCase().includes('payload')
    ) {
      const fileMb = (file.size / (1024 * 1024)).toFixed(1)
      throw new Error(
        `O arquivo "${file.name}" (${fileMb} MB) foi recusado pelo servidor por tamanho excessivo. O limite máximo permitido é ${MAX_SINGLE_FILE_SIZE_LABEL}.`,
      )
    }
    if (error?.data?.data?.file?.message) {
      throw new Error(`Erro no arquivo "${file.name}": ${error.data.data.file.message}`)
    }
    throw error
  }
}

export async function updateAiKnowledgeFile(
  id: string,
  data: Partial<Pick<AiKnowledgeFile, 'name' | 'enterprise' | 'is_active' | 'property_id'>>,
): Promise<AiKnowledgeFile> {
  return await pb.collection('ai_knowledge_files').update<AiKnowledgeFile>(id, data, {
    expand: 'property_id',
  })
}

export async function uploadMultipleAiKnowledgeFiles(
  files: File[],
  userId: string,
  enterprise?: string,
  currentUsedBytes?: number,
  propertyId?: string,
): Promise<AiKnowledgeFile[]> {
  // Valida todos os arquivos juntos antes de iniciar uploads
  await assertCanUploadFiles(files, currentUsedBytes, userId)

  const results: AiKnowledgeFile[] = []
  let cumulativeUsed = currentUsedBytes
  for (const file of files) {
    const uploaded = await uploadAiKnowledgeFile(
      file,
      userId,
      undefined,
      enterprise,
      cumulativeUsed,
      propertyId,
    )
    results.push(uploaded)
    if (typeof cumulativeUsed === 'number') {
      cumulativeUsed += file.size
    }
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

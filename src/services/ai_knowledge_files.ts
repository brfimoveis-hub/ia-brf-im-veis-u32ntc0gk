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
  // Valida limite individual (500 MB) e limite de cota total (2 GB) da Bia
  await assertCanUploadFiles([file], currentUsedBytes, userId)

  let finalEnterprise = enterprise?.trim() || ''
  let finalPropertyId = propertyId?.trim() || ''

  // Detecção proativa se o arquivo for do Vistage
  const lowerName = (customName || file.name).toLowerCase()
  if (!finalEnterprise && lowerName.includes('vistage')) {
    finalEnterprise = 'Vistage Residence'
  }

  if (!finalPropertyId && lowerName.includes('vistage')) {
    try {
      const vistageProp = await pb
        .collection('properties')
        .getFirstListItem<any>("code = 'VISTAGE' || code = 'LM-VISTAGE' || title ~ 'Vistage'")
      if (vistageProp?.id) {
        finalPropertyId = vistageProp.id
        if (!finalEnterprise) {
          finalEnterprise = vistageProp.title || 'Vistage Residence'
        }
      }
    } catch (_) {
      // Best-effort lookup
    }
  }

  const formData = new FormData()
  formData.append('user_id', userId)
  formData.append('name', customName || file.name)
  if (finalEnterprise) {
    formData.append('enterprise', finalEnterprise)
  }
  if (finalPropertyId) {
    formData.append('property_id', finalPropertyId)
  }
  formData.append('file', file)
  formData.append('file_size', String(file.size))
  formData.append('mime_type', file.type || 'application/pdf')
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
    if (status === 504 || status === 502) {
      throw new Error(
        `Tempo limite excedido ao processar "${file.name}". O upload foi interrompido pelo gateway de rede.`,
      )
    }
    if (error?.data?.data?.file?.message) {
      throw new Error(`Erro no arquivo "${file.name}": ${error.data.data.file.message}`)
    }
    const detailedErrors = error?.data?.data
      ? Object.entries(error.data.data)
          .map(([k, v]: [string, any]) => `${k}: ${v?.message || v}`)
          .join(', ')
      : ''
    if (detailedErrors) {
      throw new Error(`Erro no upload de "${file.name}": ${message} (${detailedErrors})`)
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
  if (record.file) {
    return pb.files.getURL(record, record.file)
  }
  // Se não houver arquivo binário salvo mas houver link público no extracted_text ou resumo
  const text = record.extracted_text || record.summary || ''
  const linkMatch = text.match(/https:\/\/(?:drive\.google\.com|docs\.google\.com)[^\s"'>)]+/)
  if (linkMatch) {
    return linkMatch[0]
  }
  return '#'
}

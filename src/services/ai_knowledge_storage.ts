import pb from '@/lib/pocketbase/client'
import { getAiKnowledgeFiles, type AiKnowledgeFile } from './ai_knowledge_files'
import { getLaunches, type Launch } from './launches'

// Cota de armazenamento total da Base de Conhecimento da Bia: 1 GB
export const BIA_TOTAL_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024 // 1 GB (1.073.741.824 bytes)
export const BIA_TOTAL_STORAGE_LIMIT_LABEL = '1 GB'
export const MAX_SINGLE_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
export const MAX_SINGLE_FILE_SIZE_LABEL = '100 MB'

export interface StorageUsageSummary {
  totalUsedBytes: number
  totalLimitBytes: number
  availableBytes: number
  usagePercentage: number
  formattedUsed: string
  formattedLimit: string
  formattedAvailable: string
  kbFilesBytes: number
  kbFilesCount: number
  launchFilesBytes: number
  launchFilesCount: number
  isFull: boolean
  isNearFull: boolean // >= 90%
}

export function formatStorageBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1))
  return `${val} ${sizes[i]}`
}

/**
 * Calcula o uso total de armazenamento somando:
 * 1. Arquivos da base de conhecimento da Bia (`ai_knowledge_files`)
 * 2. Arquivos de materiais e galeria dos lançamentos (`launches.attachments` e `launches.images`)
 */
export async function calculateBiaStorageUsage(
  userId?: string,
  cachedKbFiles?: AiKnowledgeFile[],
  cachedLaunches?: Launch[],
): Promise<StorageUsageSummary> {
  const kbFiles = cachedKbFiles || (await getAiKnowledgeFiles(userId))
  const launches = cachedLaunches || (await getLaunches())

  let kbFilesBytes = 0
  for (const f of kbFiles) {
    if (typeof f.file_size === 'number' && f.file_size > 0) {
      kbFilesBytes += f.file_size
    }
  }

  // Estimar / calcular bytes de materiais de lançamentos
  // Em launches, attachments e images são listas de nomes de arquivos armazenados no PocketBase.
  // Também checamos se há arquivos de ai_knowledge_files vinculados a lançamentos.
  let launchFilesBytes = 0
  let launchFilesCount = 0

  for (const l of launches) {
    if (Array.isArray(l.images)) {
      launchFilesCount += l.images.length
      // Se não temos tamanho exato de arquivo nos campos do PB, usamos média conservadora de 1.5MB por foto de galeria
      launchFilesBytes += l.images.length * 1.5 * 1024 * 1024
    }
    if (Array.isArray(l.attachments)) {
      launchFilesCount += l.attachments.length
      // Média conservadora de 3MB por PDF/anexo de lançamento
      launchFilesBytes += l.attachments.length * 3 * 1024 * 1024
    }
  }

  const totalUsedBytes = kbFilesBytes + launchFilesBytes
  const totalLimitBytes = BIA_TOTAL_STORAGE_LIMIT_BYTES
  const availableBytes = Math.max(0, totalLimitBytes - totalUsedBytes)
  const usagePercentage = Math.min(100, Math.round((totalUsedBytes / totalLimitBytes) * 100))
  const isFull = totalUsedBytes >= totalLimitBytes
  const isNearFull = usagePercentage >= 90

  return {
    totalUsedBytes,
    totalLimitBytes,
    availableBytes,
    usagePercentage,
    formattedUsed: formatStorageBytes(totalUsedBytes),
    formattedLimit: BIA_TOTAL_STORAGE_LIMIT_LABEL,
    formattedAvailable: formatStorageBytes(availableBytes),
    kbFilesBytes,
    kbFilesCount: kbFiles.length,
    launchFilesBytes,
    launchFilesCount,
    isFull,
    isNearFull,
  }
}

/**
 * Valida se um ou mais arquivos podem ser enviados sem estourar o limite de 1 GB.
 * Se estourar a cota ou se o arquivo individual for > 100 MB, lança um erro amigável em português.
 */
export async function assertCanUploadFiles(
  incomingFiles: (File | { size: number; name: string })[],
  currentUsedBytes?: number,
  userId?: string,
): Promise<{ newTotalUsed: number; willFit: boolean }> {
  let usedBytes = currentUsedBytes
  if (typeof usedBytes !== 'number') {
    const summary = await calculateBiaStorageUsage(userId)
    usedBytes = summary.totalUsedBytes
  }

  let incomingTotalBytes = 0
  for (const file of incomingFiles) {
    if (file.size > MAX_SINGLE_FILE_SIZE) {
      throw new Error(
        `O arquivo "${file.name}" ultrapassa o limite individual de ${MAX_SINGLE_FILE_SIZE_LABEL}.`,
      )
    }
    incomingTotalBytes += file.size
  }

  const newTotal = usedBytes + incomingTotalBytes
  if (newTotal > BIA_TOTAL_STORAGE_LIMIT_BYTES) {
    const exceededMb = Math.ceil((newTotal - BIA_TOTAL_STORAGE_LIMIT_BYTES) / (1024 * 1024))
    throw new Error(
      `Espaço cheio: ${BIA_TOTAL_STORAGE_LIMIT_LABEL} atingido. Remova arquivos antigos para liberar espaço. (O envio ultrapassaria a cota em ${exceededMb} MB)`,
    )
  }

  return {
    newTotalUsed: newTotal,
    willFit: true,
  }
}

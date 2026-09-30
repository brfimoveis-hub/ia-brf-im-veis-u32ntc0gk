import pb from '@/lib/pocketbase/client'
import { getAiKnowledgeFiles, type AiKnowledgeFile } from './ai_knowledge_files'
import { getLaunches, type Launch } from './launches'

// Cota de armazenamento total da Base de Conhecimento da Bia: 1 GB
export const BIA_TOTAL_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024 // 1 GB (1.073.741.824 bytes)
export const BIA_TOTAL_STORAGE_LIMIT_LABEL = '1 GB'
export const MAX_SINGLE_FILE_SIZE = 200 * 1024 * 1024 // 200 MB (permite books grandes com renders de lançamentos como Vistage)
export const MAX_SINGLE_FILE_SIZE_LABEL = '200 MB'

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
 * Extensões aceitas na Base de Conhecimento da Bia
 */
export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.csv',
  '.xlsx',
  '.xls',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]

/**
 * Valida se um ou mais arquivos podem ser enviados sem estourar o limite individual de 200 MB
 * ou a cota global de 1 GB da Bia.
 * Lança mensagens específicas e detalhadas informando exatamente o motivo e valores reais.
 */
export async function assertCanUploadFiles(
  incomingFiles: (File | { size: number; name: string; type?: string })[],
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
    // 1. Verificação de tipo de arquivo
    const lowerName = file.name.toLowerCase()
    const isExtensionAllowed = ALLOWED_FILE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
    if (!isExtensionAllowed) {
      const extension = lowerName.includes('.')
        ? lowerName.substring(lowerName.lastIndexOf('.'))
        : 'desconhecido'
      throw new Error(
        `Formato não suportado: "${file.name}" (${extension}). Formatos aceitos: PDF, DOCX, TXT, MD, CSV, XLSX e Imagens (PNG/JPG).`,
      )
    }

    // 2. Verificação de limite individual por arquivo (200 MB)
    if (file.size > MAX_SINGLE_FILE_SIZE) {
      const fileMb = (file.size / (1024 * 1024)).toFixed(1)
      throw new Error(
        `O arquivo "${file.name}" tem ${fileMb} MB e ultrapassa o limite individual de ${MAX_SINGLE_FILE_SIZE_LABEL}. Reduza o tamanho ou divida o documento.`,
      )
    }

    incomingTotalBytes += file.size
  }

  // 3. Verificação de cota total compartilhada da Bia (1 GB)
  const newTotal = usedBytes + incomingTotalBytes
  if (newTotal > BIA_TOTAL_STORAGE_LIMIT_BYTES) {
    const currentUsedMb = (usedBytes / (1024 * 1024)).toFixed(1)
    const incomingMb = (incomingTotalBytes / (1024 * 1024)).toFixed(1)
    const exceededMb = Math.ceil((newTotal - BIA_TOTAL_STORAGE_LIMIT_BYTES) / (1024 * 1024))
    throw new Error(
      `Cota de armazenamento da Bia atingida: espaço usado ${currentUsedMb} MB de 1 GB. O envio de ${incomingMb} MB ultrapassa a cota em ${exceededMb} MB. Remova arquivos antigos para liberar espaço.`,
    )
  }

  return {
    newTotalUsed: newTotal,
    willFit: true,
  }
}

import pb from '@/lib/pocketbase/client'
import { type Property, getActiveProperties } from '@/services/properties'
import { type Launch, getLaunches } from '@/services/launches'
import { type AiKnowledgeFile, getAiKnowledgeFiles } from '@/services/ai_knowledge_files'

export interface PropertyIntegrityMissingItem {
  key:
    | 'code'
    | 'website_url'
    | 'price'
    | 'description'
    | 'floor_plans'
    | 'ebook_or_table'
    | 'knowledge_files'
  label: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface PropertyIntegrityReportItem {
  id: string
  code: string
  title: string
  city: string
  neighborhood: string
  property_type: string
  price: number
  price_formatted: string
  url: string
  is_active: boolean
  is_complete: boolean
  missing_items: PropertyIntegrityMissingItem[]
  linked_files_count: number
  has_floor_plans: boolean
  has_price_table: boolean
  has_ebook_or_presentation: boolean
  associated_launch?: {
    id: string
    name: string
    slug: string
    status: string
    website_url?: string
  }
}

export interface CatalogIntegritySummary {
  total_properties: number
  complete_count: number
  incomplete_count: number
  missing_url_count: number
  missing_price_count: number
  missing_files_count: number
  items: PropertyIntegrityReportItem[]
  unlinked_files_count: number
}

/**
 * Analisa a integridade de cada imóvel do catálogo e dos lançamentos.
 * Regra: Um imóvel/lançamento está COMPLETO se possui:
 * 1. Link individual oficial do site (url preenchida e válida no domínio brfimoveis.com.br)
 * 2. Preço definido (> 0)
 * 3. Arquivo vinculado de tabela de preços e/ou e-book de apresentação
 * 4. Arquivo ou especificação de plantas/unidades
 */
export async function getCatalogIntegrityReport(userId?: string): Promise<CatalogIntegritySummary> {
  const [properties, launches, knowledgeFiles] = await Promise.all([
    getActiveProperties(),
    getLaunches().catch(() => [] as Launch[]),
    getAiKnowledgeFiles(userId).catch(() => [] as AiKnowledgeFile[]),
  ])

  // Mapear arquivos vinculados por property_id e por correspondência de texto/tag
  const filesByPropId = new Map<string, AiKnowledgeFile[]>()
  let unlinkedFilesCount = 0

  for (const f of knowledgeFiles) {
    if (f.property_id) {
      const list = filesByPropId.get(f.property_id) || []
      list.push(f)
      filesByPropId.set(f.property_id, list)
    } else {
      unlinkedFilesCount++
    }
  }

  // Mapear lançamentos por slug ou nome
  const launchMap = new Map<string, Launch>()
  for (const l of launches) {
    if (l.slug) launchMap.set(l.slug.toLowerCase(), l)
    if (l.name) launchMap.set(l.name.toLowerCase(), l)
  }

  let completeCount = 0
  let incompleteCount = 0
  let missingUrlCount = 0
  let missingPriceCount = 0
  let missingFilesCount = 0

  const items: PropertyIntegrityReportItem[] = properties.map((prop) => {
    const missing: PropertyIntegrityMissingItem[] = []
    const linkedFiles = filesByPropId.get(prop.id) || []

    // 1. Checagem de Código preenchido
    const hasValidCode = Boolean(prop.code && prop.code.trim().length > 0)
    if (!hasValidCode) {
      missing.push({
        key: 'code',
        label: 'Sem código de referência',
        description: 'Código do imóvel ausente ou em branco',
        severity: 'high',
      })
    }

    // 2. Checagem de Link oficial brfimoveis.com.br
    const hasValidUrl = Boolean(
      prop.url && prop.url.trim().length > 10 && prop.url.includes('brfimoveis.com.br'),
    )

    if (!hasValidUrl) {
      missingUrlCount++
      missing.push({
        key: 'website_url',
        label: 'Sem link oficial brfimoveis.com.br',
        description: 'Imóvel sem URL do domínio oficial brfimoveis.com.br',
        severity: 'high',
      })
    }

    // 3. Checagem de Preço > 0
    const hasValidPrice = Boolean(typeof prop.price === 'number' && prop.price > 0)

    if (!hasValidPrice) {
      missingPriceCount++
      missing.push({
        key: 'price',
        label: 'Sem preço informado (> 0)',
        description: 'Valor zerado ou em branco no cadastro',
        severity: 'high',
      })
    }

    // 4. Checagem de Descrição preenchida (mínimo 10 caracteres significativos)
    const hasValidDescription = Boolean(prop.description && prop.description.trim().length >= 10)
    if (!hasValidDescription) {
      missing.push({
        key: 'description',
        label: 'Sem descrição cadastrada',
        description: 'A descrição do imóvel está ausente ou insuficiente no cadastro',
        severity: 'high',
      })
    }

    // Arquivos, PDFs, plantas e fotos são informativos e opcionais (não penalizam integridade)
    const hasPriceTable =
      linkedFiles.some(
        (f) =>
          (f.name || '').toLowerCase().includes('tabela') ||
          (f.extracted_text || '').toLowerCase().includes('tabela de'),
      ) || Boolean(prop.price_formatted)

    const hasFloorPlans =
      linkedFiles.some(
        (f) =>
          (f.name || '').toLowerCase().includes('planta') ||
          (f.name || '').toLowerCase().includes('layout') ||
          (f.extracted_text || '').toLowerCase().includes('planta') ||
          (f.extracted_text || '').toLowerCase().includes('área privativa'),
      ) || Boolean(prop.area_privativa && prop.area_privativa > 0)

    const hasEbookOrPresentation =
      linkedFiles.some(
        (f) =>
          (f.name || '').toLowerCase().includes('book') ||
          (f.name || '').toLowerCase().includes('apresentacao') ||
          (f.name || '').toLowerCase().includes('apresentação') ||
          (f.name || '').toLowerCase().includes('dossie') ||
          (f.name || '').toLowerCase().includes('dossiê') ||
          (f.name || '').toLowerCase().includes('guia') ||
          (f.name || '').toLowerCase().endsWith('.pdf'),
      ) || linkedFiles.length > 0

    if (linkedFiles.length === 0) {
      missingFilesCount++
    }

    // Associação com Lançamento correspondente (se houver)
    let associatedLaunch: PropertyIntegrityReportItem['associated_launch'] = undefined
    const propTitleLower = (prop.title || '').toLowerCase()
    for (const l of launches) {
      if (
        (l.slug && propTitleLower.includes(l.slug.replace(/-/g, ' '))) ||
        (l.name && propTitleLower.includes(l.name.toLowerCase()))
      ) {
        associatedLaunch = {
          id: l.id,
          name: l.name,
          slug: l.slug,
          status: l.status,
          website_url: l.website_url,
        }
        break
      }
    }

    // Redefinição conforme especificação:
    // is_complete = code preenchido && url contém brfimoveis.com.br && price > 0 && description >= 20 chars
    // PDF, amenidades e fotos são opcionais e não tornam o imóvel incompleto
    const isComplete = hasValidCode && hasValidUrl && hasValidPrice && hasValidDescription
    if (isComplete) {
      completeCount++
    } else {
      incompleteCount++
    }

    return {
      id: prop.id,
      code: prop.code || 'S/C',
      title: prop.title,
      city: prop.city,
      neighborhood: prop.neighborhood,
      property_type: prop.property_type || 'Imóvel',
      price: prop.price || 0,
      price_formatted: prop.price_formatted || 'Consulte',
      url: prop.url || '',
      is_active: prop.is_active ?? true,
      is_complete: isComplete,
      missing_items: missing,
      linked_files_count: linkedFiles.length,
      has_floor_plans: hasFloorPlans,
      has_price_table: hasPriceTable,
      has_ebook_or_presentation: hasEbookOrPresentation,
      associated_launch: associatedLaunch,
    }
  })

  return {
    total_properties: properties.length,
    complete_count: completeCount,
    incomplete_count: incompleteCount,
    missing_url_count: missingUrlCount,
    missing_price_count: missingPriceCount,
    missing_files_count: missingFilesCount,
    items,
    unlinked_files_count: unlinkedFilesCount,
  }
}

/**
 * Dispara re-sincronização do catálogo via backend
 */
export interface CatalogSyncStatusResponse {
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'error'
  message?: string
  created: number
  updated: number
  errors: number
  total: number
  per_property?: Array<{ code: string; title: string; status: string; error?: string }>
  started_at?: string | null
  completed_at?: string | null
  failed_at?: string | null
  last_updated?: string | null
  error?: string
}

/**
 * Dispara re-sincronização assíncrona do catálogo via backend
 */
export async function triggerCatalogSync(): Promise<{
  success: boolean
  status?: string
  message: string
}> {
  try {
    const res = await pb.send<{ success: boolean; status?: string; message: string }>(
      '/backend/v1/sync-properties',
      {
        method: 'POST',
      },
    )
    return res
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    let friendlyMessage = 'Erro ao conectar ao servidor de sincronização.'
    if (status === 401) {
      friendlyMessage = 'Acesso restrito: autenticação necessária.'
    } else if (status === 504 || err?.name === 'TimeoutError') {
      friendlyMessage = 'Tempo limite de resposta do gateway excedido.'
    } else if (err?.message) {
      friendlyMessage = err.message
    }
    throw new Error(friendlyMessage)
  }
}

/**
 * Consulta o status atual do processamento de sincronização
 */
export async function getCatalogSyncStatus(): Promise<CatalogSyncStatusResponse> {
  try {
    const res = await pb.send<CatalogSyncStatusResponse>('/backend/v1/sync-properties/status', {
      method: 'GET',
    })
    return res
  } catch (err: any) {
    return {
      status: 'idle',
      message: err?.message || 'Não foi possível obter o status da sincronização.',
      created: 0,
      updated: 0,
      errors: 0,
      total: 49,
    }
  }
}

/**
 * Dispara auto-organização imediata de arquivos em dossiês de imóveis
 */
export async function triggerAiKnowledgeAutoOrganize(): Promise<{
  success: boolean
  message: string
  updated_count: number
}> {
  const res = await pb.send<{
    success: boolean
    message: string
    updated_count: number
  }>('/backend/v1/ai-knowledge/auto-organize', { method: 'POST' })
  return res
}

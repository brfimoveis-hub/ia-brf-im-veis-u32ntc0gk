import pb from '@/lib/pocketbase/client'
import { type Property, getActiveProperties } from '@/services/properties'
import { type Launch, getLaunches } from '@/services/launches'
import { type AiKnowledgeFile, getAiKnowledgeFiles } from '@/services/ai_knowledge_files'

export interface PropertyIntegrityMissingItem {
  key: 'website_url' | 'price' | 'floor_plans' | 'ebook_or_table' | 'knowledge_files'
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

    // 1. Checagem de Link individual oficial
    const hasValidUrl = Boolean(
      prop.url &&
      prop.url.trim().length > 10 &&
      (prop.url.includes('brfimoveis.com.br') || prop.url.startsWith('http')),
    )

    if (!hasValidUrl) {
      missingUrlCount++
      missing.push({
        key: 'website_url',
        label: 'Sem link oficial do site',
        description: 'Imóvel sem URL canônica em www.brfimoveis.com.br/{id}/imoveis/{slug}',
        severity: 'high',
      })
    }

    // 2. Checagem de Preço
    const hasValidPrice = Boolean(
      (typeof prop.price === 'number' && prop.price > 0) ||
      (prop.price_formatted &&
        prop.price_formatted.toLowerCase().includes('r$') &&
        !prop.price_formatted.toLowerCase().includes('sob consulta')),
    )

    if (!hasValidPrice) {
      missingPriceCount++
      missing.push({
        key: 'price',
        label: 'Sem preço informado',
        description: 'Valor zerado ou em branco no cadastro',
        severity: 'high',
      })
    }

    // 3. Checagem de Arquivos (Plantas, Ebook/Apresentação, Tabela de valores)
    const allFileNames = linkedFiles.map((f) => (f.name || '').toLowerCase()).join(' ')
    const allFileTexts = linkedFiles.map((f) => (f.extracted_text || '').toLowerCase()).join(' ')
    const combinedFilesContent = allFileNames + ' ' + allFileTexts

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
      missing.push({
        key: 'knowledge_files',
        label: 'Sem dossiê / arquivos vinculados',
        description: 'Nenhum PDF, tabela ou apresentação vinculada em ai_knowledge_files',
        severity: 'medium',
      })
    } else {
      if (!hasFloorPlans) {
        missing.push({
          key: 'floor_plans',
          label: 'Sem arquivo de plantas',
          description: 'Não foi detectado arquivo de plantas humanizadas ou layout',
          severity: 'low',
        })
      }
      if (!hasPriceTable) {
        missing.push({
          key: 'ebook_or_table',
          label: 'Sem tabela de valores acoplada',
          description: 'Falta tabela vigente de preços e condições',
          severity: 'medium',
        })
      }
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

    const isComplete = missing.length === 0
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
export async function triggerCatalogSync(): Promise<{ success: boolean; message: string }> {
  const res = await pb.send<{ success: boolean; message: string }>('/backend/v1/sync-properties', {
    method: 'POST',
  })
  return res
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

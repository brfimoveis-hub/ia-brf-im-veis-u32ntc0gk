import { pb } from '@/lib/pocketbase/client'

export interface Property {
  id: string
  code: string
  title: string
  property_type?: string
  transaction_type?: string
  price?: number
  price_formatted?: string
  city?: string
  neighborhood?: string
  bedrooms?: number
  suites?: number
  bathrooms?: number
  parking_spaces?: number
  area_privativa?: number
  area_total?: number
  description?: string
  url?: string
  image_url?: string
  features?: string[]
  is_active: boolean
  created: string
  updated: string
}

/**
 * Busca todos os imóveis ativos do catálogo (site brfimoveis.com.br)
 */
export async function getActiveProperties(): Promise<Property[]> {
  try {
    const records = await pb.collection('properties').getFullList<Property>({
      filter: 'is_active = true',
      sort: 'code',
      fields:
        'id,code,title,property_type,transaction_type,price,price_formatted,city,neighborhood,bedrooms,suites,bathrooms,parking_spaces,area_privativa,url,image_url,is_active,created,updated',
    })
    return records
  } catch (err) {
    console.warn('[properties] Erro ao buscar imóveis ativos:', err)
    return []
  }
}

/**
 * Tenta identificar a qual imóvel do catálogo um texto/nome de arquivo pertence.
 * Útil para auto-linkagem quando o usuário sobe ou edita um documento.
 */
export function detectPropertyFromText(text: string, properties: Property[]): Property | null {
  if (!text || !properties || properties.length === 0) return null

  const cleanText = text.toLowerCase()
  const cleanTextAlphanum = cleanText.replace(/[^a-z0-9]/gi, '')

  // 1. Tentar correspondência exata por código (ex: "AP343", "ARU 341", "LM 330", "AP-344")
  for (const prop of properties) {
    const rawCode = (prop.code || '').toLowerCase().trim()
    if (!rawCode || rawCode.length < 3) continue

    const codeAlphanum = rawCode.replace(/[^a-z0-9]/gi, '')

    // Testar com e sem hash/separadores (ex: #AP343 ou AP-343 ou AP343)
    if (codeAlphanum.length >= 3) {
      // Regex de borda de palavra ou código isolado
      const codeRegex = new RegExp(`(^|[^a-z0-9])#?${codeAlphanum}([^a-z0-9]|$)`, 'i')
      if (codeRegex.test(cleanText) || cleanTextAlphanum.includes(codeAlphanum)) {
        return prop
      }
    }
  }

  // 2. Tentar por palavras-chave fortes do título ou nome do lançamento (ex: "Vistage", "Viva Balneário", "Neo Continente", "Colinas de São Pedro")
  for (const prop of properties) {
    const titleLower = (prop.title || '').toLowerCase()
    // Identifica termos distintivos com mais de 5 caracteres
    const keywords = [
      'vistage',
      'viva balneário',
      'viva balneario',
      'neo continente',
      'colinas de são pedro',
      'solar di plaza',
      'villa dos açores',
      'villa dos acores',
    ]
    for (const kw of keywords) {
      if (titleLower.includes(kw) && cleanText.includes(kw)) {
        return prop
      }
    }
  }

  return null
}

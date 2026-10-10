export interface StageParsedInstruction {
  stageNumber: number
  canonicalName: string
  rawHeader: string
  phase?: string
  objective?: string
  technique?: string
  trigger?: string
  crmTags?: string
  fullContent: string
  shortSummary: string
  source: 'parsed' | 'fallback'
}

// Mapa canônico de 1 a 10 com os nomes canônicos e descrições de fallback
export const CANONICAL_STAGE_NAMES: Record<number, string> = {
  1: '1. Acolhimento',
  2: '2. Qualificação',
  3: '3. Apresentação Consultiva',
  4: '4. Sondagem Financeira',
  5: '5. Nutrição de Interesse',
  6: '6. Convite de Visita',
  7: '7. Confirmação e Rota',
  8: '8. Feedback da Visita',
  9: '9. Proposta e Condições',
  10: '10. Pós-venda e Indicação',
}

export const FALLBACK_STAGE_DESCRIPTIONS: Record<number, string> = {
  1: 'Acolhimento caloroso e imediato, conexão inicial e validação do nome do cliente e do imóvel de interesse.',
  2: 'Diálogo consultivo fluido mapeando localização preferida e faixa aproximada de investimento (uma pergunta por vez).',
  3: 'Apresentação envolvente do imóvel em foco (estilo de vida e diferenciais) gerando curiosidade antes de abrir preços e links.',
  4: 'Qualificação de perfil e condições de pagamento: morador/investidor, à vista, financiamento bancário, FGTS ou permuta.',
  5: 'Manutenção ativa de contato com novos ângulos do dossiê, evolução das obras, plantas e valorização do m².',
  6: 'Conversão do interesse em experiência presencial no imóvel ou estande com técnica de opções (sexta à tarde ou sábado de manhã).',
  7: 'Confirmação prévia de presença, orientações de rota e localização exata garantindo o comparecimento com segurança.',
  8: 'Coleta de impressões pós-visita: identificação dos pontos altos que encantaram e esclarecimento do que faltou para decidir.',
  9: 'Plano financeiro de aquisição, superação técnica de objeções (CAB e Ferir/Curar) e isolamento de condições.',
  10: 'Condução à assinatura de contrato, validação documental, acompanhamento da entrega das chaves e pedido de indicações.',
}

/**
 * Normaliza número do estágio a partir de qualquer string (ex: "1. Acolhimento", "1", "Estágio 1", "Passo 10")
 */
export function extractStageNumber(stageIdentifier: string | number): number | null {
  if (typeof stageIdentifier === 'number') {
    return stageIdentifier >= 1 && stageIdentifier <= 10 ? stageIdentifier : null
  }
  const str = String(stageIdentifier).trim()
  const match = str.match(/(?:estágio|passo|cadência|etapa)?\s*([0-9]{1,2})/i)
  if (match) {
    const num = parseInt(match[1], 10)
    if (num >= 1 && num <= 10) return num
  }
  return null
}

/**
 * Localiza a seção de "Mapa de Movimento" dentro do texto único da Bia.
 * Se não houver cabeçalho explícito, busca a partir do bloco onde se fala de "10 estágios" ou "Estágio 1".
 */
function extractMovementMapSection(fullText: string): string {
  if (!fullText) return ''

  // Busca por "3. MAPA DE MOVIMENTO" ou "MAPA DE MOVIMENTO DO ATENDIMENTO" ou similar
  const headerMatch = fullText.match(
    /(?:#+\s*|\d+[.\-)]\s*)?MAPA\s+DE\s+MOVIMENTO[^\n]*\n([\s\S]*?)(?=(?:\n(?:#+\s*|\d+[.\-)]\s*)[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{4,}|\n[0-9]{1,2}\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]|$))/i,
  )
  if (headerMatch && headerMatch[1] && headerMatch[1].trim().length > 100) {
    return headerMatch[1].trim()
  }

  // Fallback: se não achar o fim da seção, pega do início do "MAPA DE MOVIMENTO" até a seção seguinte (ex: "DEFINIÇÃO DAS DUAS TRILHAS")
  const startIdx = fullText.search(/MAPA\s+DE\s+MOVIMENTO/i)
  if (startIdx !== -1) {
    const sub = fullText.substring(startIdx)
    const nextSectionIdx = sub.search(/\n(?:\d+\.\s+|#+\s*)[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{4,}/i)
    if (nextSectionIdx > 200) {
      return sub.substring(0, nextSectionIdx)
    }
    return sub
  }

  // Último fallback: texto completo
  return fullText
}

/**
 * Parser tolerante que extrai os 10 estágios da seção do Mapa de Movimento.
 * Aceita formatos variados:
 *  - "• Estágio 1 — Captura + Identificação (Fase: Lead):"
 *  - "1. Acolhimento"
 *  - "1 - Captura + Identificação"
 *  - "### Estágio 1: ..."
 */
export function parseMovementMapStages(ruleText: string): Record<number, StageParsedInstruction> {
  const result: Record<number, StageParsedInstruction> = {}

  if (!ruleText || typeof ruleText !== 'string') {
    return createAllFallbacks()
  }

  const sectionText = extractMovementMapSection(ruleText)

  // Regex para capturar linhas de início de estágio:
  // Ex: "• Estágio 1 — Captura + Identificação (Fase: Lead):"
  // ou "1. Acolhimento"
  // ou "10. Pós-venda e Indicação"
  const stageHeaderRegex =
    /(?:^[ \t]*(?:[•\-*]|#+)?\s*(?:Estágio|Etapa|Passo)?\s*([1-9]|10)\s*[.—\-:)]\s*([^\n\r]+))/gim

  const matches: Array<{
    num: number
    header: string
    startIndex: number
    fullHeaderLine: string
  }> = []

  let m: RegExpExecArray | null
  while ((m = stageHeaderRegex.exec(sectionText)) !== null) {
    const stageNum = parseInt(m[1], 10)
    // Filtro de sanidade: apenas 1 a 10 e evitar duplicatas se o texto repete o número
    if (stageNum >= 1 && stageNum <= 10) {
      // Evita falsos positivos se a linha capturada for apenas "1. IDENTIDADE..." no topo do texto
      const headerTitle = m[2].trim()
      const isTopLevelChapter =
        /IDENTIDADE|CONDUÇÃO|DEFINIÇÃO|FOCO|PRIMEIRA|DOMÍNIO|QUALIFICAÇÃO|REGRA|PROGRAMA|ANÁLISE|INTELIGÊNCIA/i.test(
          headerTitle,
        ) &&
        !/acolhimento|validação|crm|contato|personalizado|perfil|nutrição|visita|rota|proposta|fechamento|pós-venda|captura|sondagem|indicação/i.test(
          headerTitle,
        )

      if (!isTopLevelChapter) {
        matches.push({
          num: stageNum,
          header: headerTitle,
          startIndex: m.index,
          fullHeaderLine: m[0],
        })
      }
    }
  }

  // Ordena por índice de ocorrência
  matches.sort((a, b) => a.startIndex - b.startIndex)

  // Para cada match, o conteúdo vai até o próximo match ou final do texto
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]
    // Se já encontramos esse número de estágio antes, mantemos ou atualizamos se este for mais relevante
    const nextStart = i + 1 < matches.length ? matches[i + 1].startIndex : sectionText.length
    let blockText = sectionText.substring(cur.startIndex, nextStart).trim()

    // Remove eventual cabeçalho de seção subsequente se for o último estágio
    if (i === matches.length - 1) {
      const cutIdx = blockText.search(/\n(?:\d+\.\s+|#+\s*)[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{4,}/)
      if (cutIdx > 50) {
        blockText = blockText.substring(0, cutIdx).trim()
      }
      // Também corta se aparecer "• Gestão de Promessas"
      const promiseCut = blockText.search(/\n\s*•?\s*Gestão de Promessas/i)
      if (promiseCut > 50) {
        blockText = blockText.substring(0, promiseCut).trim()
      }
    }

    // Extração granular de campos dentro do bloco do estágio
    const phaseMatch =
      cur.header.match(/\(Fase:\s*([^)]+)\)/i) || blockText.match(/Fase:\s*([^\n)]+)/i)
    const phase = phaseMatch ? phaseMatch[1].trim() : undefined

    const objMatch = blockText.match(/(?:Objetivo|Foco|Meta):\s*([^\n\r]+(?:\n[ \t]+[^\n\r]+)*)/i)
    const objective = objMatch ? cleanParsedField(objMatch[1]) : undefined

    const tecMatch = blockText.match(
      /(?:Técnica|Técnicas|Como conduzir|Metodologia):\s*([^\n\r]+(?:\n[ \t]+[^\n\r]+)*)/i,
    )
    const technique = tecMatch ? cleanParsedField(tecMatch[1]) : undefined

    const trigMatch = blockText.match(/(?:Gatilho|Momento|Quando acionar):\s*([^\n\r]+)/i)
    const trigger = trigMatch ? cleanParsedField(trigMatch[1]) : undefined

    const tagsMatch = blockText.match(/Tags?(?:\s+de\s+CRM)?:\s*([^\n\r]+)/i)
    const crmTags = tagsMatch ? cleanParsedField(tagsMatch[1]) : undefined

    // Limpa a primeira linha do bloco se for o cabeçalho
    const lines = blockText.split('\n')
    const bodyLines = lines.slice(1).join('\n').trim()

    // Resumo curto para exibição compacta no card da coluna
    let shortSummary = ''
    if (objective) {
      shortSummary = objective
    } else if (bodyLines) {
      // Primeira linha não vazia ou primeiras 140 letras
      const firstUsefulLine = bodyLines
        .split('\n')
        .map((l) => l.replace(/^[ \t]*[-•*>]\s*/, '').trim())
        .filter(Boolean)[0]
      shortSummary = firstUsefulLine || bodyLines.slice(0, 140)
    } else {
      shortSummary = FALLBACK_STAGE_DESCRIPTIONS[cur.num] || cur.header
    }

    // Se o resumo ficou muito longo para a caixinha compacta, truncamos de forma elegante
    if (shortSummary.length > 200) {
      shortSummary = shortSummary.slice(0, 197).trim() + '...'
    }

    result[cur.num] = {
      stageNumber: cur.num,
      canonicalName: CANONICAL_STAGE_NAMES[cur.num] || `Estágio ${cur.num}`,
      rawHeader: cur.header,
      phase,
      objective,
      technique,
      trigger,
      crmTags,
      fullContent: blockText,
      shortSummary,
      source: 'parsed',
    }
  }

  // Preenche estágios faltantes com fallback discreto
  for (let n = 1; n <= 10; n++) {
    if (!result[n]) {
      result[n] = {
        stageNumber: n,
        canonicalName: CANONICAL_STAGE_NAMES[n],
        rawHeader: CANONICAL_STAGE_NAMES[n],
        shortSummary: FALLBACK_STAGE_DESCRIPTIONS[n] || 'Ver o Texto Único da Bia',
        fullContent:
          FALLBACK_STAGE_DESCRIPTIONS[n] ||
          'Consulte o Texto Único da Bia no Caderno de Aprendizados.',
        source: 'fallback',
      }
    }
  }

  return result
}

function cleanParsedField(text: string): string {
  return text
    .replace(/^[ \t]*[-•*>]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function createAllFallbacks(): Record<number, StageParsedInstruction> {
  const result: Record<number, StageParsedInstruction> = {}
  for (let n = 1; n <= 10; n++) {
    result[n] = {
      stageNumber: n,
      canonicalName: CANONICAL_STAGE_NAMES[n],
      rawHeader: CANONICAL_STAGE_NAMES[n],
      shortSummary: FALLBACK_STAGE_DESCRIPTIONS[n] || 'Ver o Texto Único da Bia',
      fullContent:
        FALLBACK_STAGE_DESCRIPTIONS[n] ||
        'Consulte o Texto Único da Bia no Caderno de Aprendizados.',
      source: 'fallback',
    }
  }
  return result
}

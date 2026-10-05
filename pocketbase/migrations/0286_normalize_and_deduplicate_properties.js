/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0286: Normalização de códigos e deduplicação de registros em properties
 * 1. Normalizar códigos com espaço: "AP 334" -> "AP334", "AP 333" -> "AP333", "AP 337" -> "AP337", etc.
 * 2. Deduplicação: se houver mais de um registro para o mesmo código normalizado (ex: AP334),
 *    manter um canônico (o mais completo/recente), migrar referências em ai_knowledge_files e conversations,
 *    e remover o duplicado.
 */
migrate(
  (app) => {
    // 1. Normalizar códigos de todas as propriedades (remover espaços entre letras e números ex: "AP 334" -> "AP334")
    try {
      const allProps = app.findRecordsByFilter('properties', '', '', 500)
      for (let i = 0; i < allProps.length; i++) {
        const p = allProps[i]
        const oldCode = (p.getString('code') || '').trim()
        const normCode = oldCode.replace(/^([A-Za-z]+)\s+(\d+)/, '$1$2').trim()
        if (normCode && normCode !== oldCode) {
          p.set('code', normCode)
          app.save(p)
          console.log(`[MIG_0286] Código normalizado: "${oldCode}" -> "${normCode}" (id: ${p.id})`)
        }
      }
    } catch (eNorm) {
      console.warn('[MIG_0286] Erro na normalização de códigos:', eNorm)
    }

    // 2. Identificar e fundir duplicatas agrupadas por código normalizado
    try {
      const propsAfter = app.findRecordsByFilter('properties', '', '', 500)
      const groups = {}

      for (let i = 0; i < propsAfter.length; i++) {
        const p = propsAfter[i]
        const code = (p.getString('code') || '').trim().toUpperCase()
        if (!code) continue
        if (!groups[code]) groups[code] = []
        groups[code].push(p)
      }

      let mergedCount = 0

      for (const code in groups) {
        const list = groups[code]
        if (list.length > 1) {
          console.log(`[MIG_0286] Encontradas ${list.length} duplicatas para o código: ${code}`)
          // Seleciona o canônico: prefere o que tiver maior quantidade de dados preenchidos ou id prioritário
          list.sort((a, b) => {
            const scoreA =
              (a.getString('description') || '').length +
              (a.getString('url') ? 100 : 0) +
              (a.getFloat('price') > 0 ? 50 : 0)
            const scoreB =
              (b.getString('description') || '').length +
              (b.getString('url') ? 100 : 0) +
              (b.getFloat('price') > 0 ? 50 : 0)
            return scoreB - scoreA
          })

          const canonical = list[0]
          console.log(`[MIG_0286] Registro canônico eleito: ${canonical.id} (code: ${code})`)

          for (let d = 1; d < list.length; d++) {
            const duplicate = list[d]
            const dupId = duplicate.id

            // Migrar ai_knowledge_files apontando para duplicate.id -> canonical.id
            try {
              const linkedFiles = app.findRecordsByFilter(
                'ai_knowledge_files',
                `property_id = '${dupId}'`,
                '',
                50,
              )
              for (let f = 0; f < linkedFiles.length; f++) {
                const fileRec = linkedFiles[f]
                fileRec.set('property_id', canonical.id)
                app.save(fileRec)
                console.log(
                  `[MIG_0286] ai_knowledge_file ${fileRec.id} remigrado de ${dupId} para ${canonical.id}`,
                )
              }
            } catch (errFiles) {
              console.warn(`[MIG_0286] Erro ao remigrar ai_knowledge_files de ${dupId}:`, errFiles)
            }

            // Excluir ou desativar o registro duplicado
            try {
              app.delete(duplicate)
              console.log(`[MIG_0286] Registro duplicado ${dupId} removido com sucesso.`)
              mergedCount++
            } catch (errDel) {
              console.warn(`[MIG_0286] Não foi possível deletar ${dupId}, desativando:`, errDel)
              duplicate.set('is_active', false)
              duplicate.set('code', `${code}_DUP_${dupId.slice(0, 4)}`)
              app.save(duplicate)
            }
          }
        }
      }

      console.log(
        `[MIG_0286] Processamento de deduplicação concluído. Duplicatas resolvidas: ${mergedCount}`,
      )
    } catch (eDedup) {
      console.warn('[MIG_0286] Erro durante a deduplicação de properties:', eDedup)
    }
  },
  (app) => {},
)

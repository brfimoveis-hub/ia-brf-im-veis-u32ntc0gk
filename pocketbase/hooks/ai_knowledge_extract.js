/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para extração automática de texto em arquivos de conhecimento da IA,
 * auto-classificação de empreendimento e desativação automática de tabelas antigas.
 * Nota: Toda lógica fica inline dentro do callback para evitar problemas de escopo no Goja/PocketBase.
 */
onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    if (!record) return e.next()
    const fileName = record.getString('file')
    if (!fileName) return e.next()

    let extractedMarkdown = ''
    const originalName = record.getString('name') || fileName
    const lowerName = originalName.toLowerCase()

    // 1. Tentar extração via $documents.toMarkdown para documentos estruturados
    const isDocument =
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls') ||
      lowerName.endsWith('.pptx')

    if (isDocument) {
      try {
        const docResult = $documents.toMarkdown({
          record: record,
          field: 'file',
        })
        if (docResult && docResult.markdown && docResult.markdown.trim()) {
          extractedMarkdown = docResult.markdown.trim()
        }
      } catch (docErr) {
        console.warn('[AI_KNOWLEDGE_FILES] $documents.toMarkdown failed: ' + String(docErr))
      }

      // Se for PDF e a extração retornou vazia ou falhou (ex: PDF escaneado ou composto apenas por imagens/renders)
      if (!extractedMarkdown && lowerName.endsWith('.pdf')) {
        extractedMarkdown =
          '[PDF visual, sem texto extraível] — Material/Book visual de apresentação: ' +
          originalName
      }
    }

    // 2. Se for arquivo de texto puro (.txt, .md, .csv, .json)
    const isPlainText =
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.json')

    if (!extractedMarkdown && isPlainText) {
      try {
        const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
        const fileUrl =
          pbUrl + '/api/files/' + record.collectionId + '/' + record.id + '/' + fileName
        const fileRes = $http.send({ url: fileUrl, method: 'GET', timeout: 10 })
        if (fileRes && fileRes.statusCode === 200 && fileRes.body) {
          extractedMarkdown = String.fromCharCode.apply(null, fileRes.body)
        }
      } catch (txtErr) {
        console.warn('[AI_KNOWLEDGE_FILES] Text fetch error: ' + String(txtErr))
      }
    }

    // 3. Se for imagem (.png, .jpg, .jpeg, .webp)
    const isImage =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp')

    if (!extractedMarkdown && isImage) {
      extractedMarkdown =
        '[Material visual/imagem anexado à base de conhecimento: ' + originalName + ']'
    }

    // 4. Identificar Imóvel (property_id) e Empreendimento (Auto-classificação compatível com Goja)
    let detectedPropertyId = (record.getString('property_id') || '').trim()
    let detectedEnterprise = (record.getString('enterprise') || '').trim()
    const combinedInspection = (originalName + ' ' + extractedMarkdown).toLowerCase()
    const combinedAlphanum = combinedInspection.replace(/[^a-z0-9]/g, '')

    // Se property_id ainda não foi atribuído, buscar entre os imóveis ativos do catálogo
    if (!detectedPropertyId) {
      try {
        const activeProperties = $app.findRecordsByFilter(
          'properties',
          'is_active = true',
          'code',
          200,
          0,
        )
        if (activeProperties && activeProperties.length > 0) {
          // Passo 1: busca por correspondência de código do imóvel (ex: #AP343, AP343, ARU 341, LM 330)
          for (var pi = 0; pi < activeProperties.length; pi++) {
            const propRec = activeProperties[pi]
            const rawCode = (propRec.getString('code') || '').toLowerCase().trim()
            if (!rawCode || rawCode.length < 3) continue

            const codeClean = rawCode.replace(/[^a-z0-9]/g, '')
            if (codeClean.length >= 3) {
              // Verifica no texto alfanumérico ou com separadores
              if (
                combinedAlphanum.indexOf(codeClean) !== -1 ||
                combinedInspection.indexOf(rawCode) !== -1
              ) {
                detectedPropertyId = propRec.id
                if (!detectedEnterprise) {
                  detectedEnterprise = propRec.getString('title') || propRec.getString('code')
                }
                break
              }
            }
          }

          // Passo 2: se ainda não achou, buscar por termos distintivos no título do imóvel
          if (!detectedPropertyId) {
            const keyTerms = [
              'vistage',
              'viva balneário',
              'viva balneario',
              'neo continente',
              'colinas de são pedro',
              'colinas de sao pedro',
              'solar di plaza',
              'solar plaza',
              'villa dos açores',
              'villa dos acores',
              'viva trindade',
              'opus agronômica',
              'opus agronomica',
              'essenzia canasvieiras',
              'condomínio fly ville',
              'fly ville',
              'luminare residence',
              'luminare',
            ]

            for (var pii = 0; pii < activeProperties.length; pii++) {
              const propRec2 = activeProperties[pii]
              const pTitle = (propRec2.getString('title') || '').toLowerCase()
              let matchedTerm = false
              for (var ki = 0; ki < keyTerms.length; ki++) {
                const kw = keyTerms[ki]
                if (pTitle.indexOf(kw) !== -1 && combinedInspection.indexOf(kw) !== -1) {
                  matchedTerm = true
                  break
                }
              }
              if (matchedTerm) {
                detectedPropertyId = propRec2.id
                if (!detectedEnterprise) {
                  detectedEnterprise = propRec2.getString('title') || propRec2.getString('code')
                }
                break
              }
            }
          }
        }
      } catch (detectErr) {
        console.warn(
          '[AI_KNOWLEDGE_FILES] Erro na detecção automática de imóvel: ' + String(detectErr),
        )
      }
    }

    if (!detectedEnterprise) {
      if (combinedInspection.indexOf('vistage') !== -1) {
        detectedEnterprise = 'Vistage Residence'
      } else if (
        combinedInspection.indexOf('viva trindade') !== -1 ||
        combinedInspection.indexOf('viva_trindade') !== -1
      ) {
        detectedEnterprise = 'Viva Trindade'
      } else if (
        combinedInspection.indexOf('neo continente') !== -1 ||
        combinedInspection.indexOf('neo_continente') !== -1
      ) {
        detectedEnterprise = 'Neo Continente'
      } else if (
        combinedInspection.indexOf('viva balne') !== -1 ||
        combinedInspection.indexOf('viva_balne') !== -1
      ) {
        detectedEnterprise = 'Viva Balneário Estreito'
      } else if (combinedInspection.indexOf('essenzia') !== -1) {
        detectedEnterprise = 'Essenzia Canasvieiras'
      } else if (
        combinedInspection.indexOf('terr') !== -1 ||
        combinedInspection.indexOf('jurere') !== -1
      ) {
        detectedEnterprise = 'Terrá Jurerê'
      } else if (combinedInspection.indexOf('opus') !== -1) {
        detectedEnterprise = 'Opus Agronômica'
      } else if (combinedInspection.indexOf('sophia') !== -1) {
        detectedEnterprise = 'Residencial Sophia'
      } else if (
        combinedInspection.indexOf('colina') !== -1 ||
        combinedInspection.indexOf('são pedro') !== -1 ||
        combinedInspection.indexOf('sao pedro') !== -1
      ) {
        detectedEnterprise = 'Colinas de São Pedro'
      } else if (
        combinedInspection.indexOf('fly ville') !== -1 ||
        combinedInspection.indexOf('fly_ville') !== -1
      ) {
        detectedEnterprise = 'Condomínio Fly Ville'
      } else if (
        combinedInspection.indexOf('solar plaza') !== -1 ||
        combinedInspection.indexOf('solar di plaza') !== -1 ||
        combinedInspection.indexOf('solar_plaza') !== -1
      ) {
        detectedEnterprise = 'Solar Plaza'
      } else if (combinedInspection.indexOf('nova governador') !== -1) {
        detectedEnterprise = 'Nova Governador Celso Ramos'
      } else if (combinedInspection.indexOf('luminare') !== -1) {
        detectedEnterprise = 'Luminare Residence'
      } else if (
        combinedInspection.indexOf('polo empresarial') !== -1 ||
        combinedInspection.indexOf('pegf') !== -1
      ) {
        detectedEnterprise = 'Polo Empresarial Grande Florianópolis'
      }
    }

    // Se o arquivo tiver 0 bytes estritos, desativar automaticamente como arquivo corrompido
    const fileSize = record.getInt('file_size') || 0
    const isTrashFile = fileSize === 0

    // Resumo amigável caso seja PDF visual/apresentação
    let fileSummary = record.getString('summary') || ''
    if (!fileSummary && extractedMarkdown.startsWith('[PDF visual, sem texto extraível]')) {
      fileSummary =
        'Material visual e renders do empreendimento (' +
        (detectedEnterprise || originalName) +
        '). Contém imagens, plantas e material gráfico.'
    }

    // 5. Salva dados extraídos e atualizados
    try {
      const recToUpdate = $app.findRecordById('ai_knowledge_files', record.id)
      if (extractedMarkdown && extractedMarkdown.trim()) {
        recToUpdate.set('extracted_text', extractedMarkdown.trim())
      }

      if (detectedPropertyId) {
        recToUpdate.set('property_id', detectedPropertyId)
      }

      if (detectedEnterprise) {
        recToUpdate.set('enterprise', detectedEnterprise)
      }

      if (fileSummary) {
        recToUpdate.set('summary', fileSummary)
      }

      if (isTrashFile) {
        recToUpdate.set('is_active', false)
      } else {
        recToUpdate.set('is_active', true)
      }

      $app.saveNoValidate(recToUpdate)
      console.log(
        '[AI_KNOWLEDGE_FILES] Processed record=' +
          record.id +
          ' property_id=' +
          (detectedPropertyId || 'none') +
          ' enterprise=' +
          (detectedEnterprise || 'none') +
          ' len=' +
          extractedMarkdown.length,
      )

      // 6. Se o arquivo for uma TABELA de preços e estiver ativo, desativar tabelas anteriores do mesmo empreendimento
      const isTableFile =
        lowerName.includes('tabela') ||
        combinedInspection.includes('tabela de vendas') ||
        combinedInspection.includes('tabela de cotas') ||
        combinedInspection.includes('tabela de custo')

      if (!isTrashFile && isTableFile && detectedEnterprise) {
        try {
          const userId = record.getString('user_id')
          let filterStr =
            "enterprise = '" +
            detectedEnterprise +
            "' && id != '" +
            record.id +
            "' && is_active != false"
          if (userId) {
            filterStr += " && user_id = '" + userId + "'"
          }
          const previousTables = $app.findRecordsByFilter(
            'ai_knowledge_files',
            filterStr,
            '-created',
            50,
            0,
          )
          for (let j = 0; j < previousTables.length; j++) {
            const prev = previousTables[j]
            const prevName = (prev.getString('name') || '').toLowerCase()
            if (prevName.includes('tabela')) {
              prev.set('is_active', false)
              $app.saveNoValidate(prev)
              console.log(
                '[AI_KNOWLEDGE_FILES] Deactivated older table id=' +
                  prev.id +
                  ' (' +
                  prev.getString('name') +
                  ') for enterprise=' +
                  detectedEnterprise,
              )
            }
          }
        } catch (deactErr) {
          console.warn(
            '[AI_KNOWLEDGE_FILES] Error deactivating previous tables: ' + String(deactErr),
          )
        }
      }
    } catch (saveErr) {
      console.error('[AI_KNOWLEDGE_FILES] Error updating record: ' + String(saveErr))
    }
  } catch (outerErr) {
    console.error(
      '[AI_KNOWLEDGE_FILES] Uncaught error in onRecordAfterCreateSuccess (non-blocking): ' +
        String(outerErr),
    )
  }
  return e.next()
}, 'ai_knowledge_files')

onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    if (!record) return e.next()
    const currentExtracted = (record.getString('extracted_text') || '').trim()
    const fileName = record.getString('file')
    if (!fileName) {
      return e.next()
    }

    const originalName = record.getString('name') || fileName
    const lowerName = originalName.toLowerCase()
    let extractedMarkdown = currentExtracted

    if (!extractedMarkdown) {
      const isDocument =
        lowerName.endsWith('.pdf') ||
        lowerName.endsWith('.docx') ||
        lowerName.endsWith('.doc') ||
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        lowerName.endsWith('.pptx')

      if (isDocument) {
        try {
          const docResult = $documents.toMarkdown({
            record: record,
            field: 'file',
          })
          if (docResult && docResult.markdown && docResult.markdown.trim()) {
            extractedMarkdown = docResult.markdown.trim()
          }
        } catch (docErr) {
          console.warn('[AI_KNOWLEDGE_FILES] $documents.toMarkdown failed: ' + String(docErr))
        }

        if (!extractedMarkdown && lowerName.endsWith('.pdf')) {
          extractedMarkdown =
            '[PDF visual, sem texto extraível] — Material/Book visual de apresentação: ' +
            originalName
        }
      }

      const isPlainText =
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.csv') ||
        lowerName.endsWith('.json')

      if (!extractedMarkdown && isPlainText) {
        try {
          const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
          const fileUrl =
            pbUrl + '/api/files/' + record.collectionId + '/' + record.id + '/' + fileName
          const fileRes = $http.send({ url: fileUrl, method: 'GET', timeout: 10 })
          if (fileRes && fileRes.statusCode === 200 && fileRes.body) {
            extractedMarkdown = String.fromCharCode.apply(null, fileRes.body)
          }
        } catch (txtErr) {
          console.warn('[AI_KNOWLEDGE_FILES] Text fetch error: ' + String(txtErr))
        }
      }
    }

    // Auto-classificação caso property_id ou enterprise estejam em branco
    let detectedPropertyId = (record.getString('property_id') || '').trim()
    let detectedEnterprise = (record.getString('enterprise') || '').trim()
    const combinedInspection = (originalName + ' ' + extractedMarkdown).toLowerCase()
    const combinedAlphanum = combinedInspection.replace(/[^a-z0-9]/g, '')

    if (!detectedPropertyId) {
      try {
        const activeProperties = $app.findRecordsByFilter(
          'properties',
          'is_active = true',
          'code',
          200,
          0,
        )
        if (activeProperties && activeProperties.length > 0) {
          for (var piU = 0; piU < activeProperties.length; piU++) {
            const propRec = activeProperties[piU]
            const rawCode = (propRec.getString('code') || '').toLowerCase().trim()
            if (!rawCode || rawCode.length < 3) continue

            const codeClean = rawCode.replace(/[^a-z0-9]/g, '')
            if (codeClean.length >= 3) {
              if (
                combinedAlphanum.indexOf(codeClean) !== -1 ||
                combinedInspection.indexOf(rawCode) !== -1
              ) {
                detectedPropertyId = propRec.id
                if (!detectedEnterprise) {
                  detectedEnterprise = propRec.getString('title') || propRec.getString('code')
                }
                break
              }
            }
          }

          if (!detectedPropertyId) {
            const keyTerms = [
              'vistage',
              'viva balneário',
              'viva balneario',
              'neo continente',
              'colinas de são pedro',
              'colinas de sao pedro',
              'solar di plaza',
              'solar plaza',
              'villa dos açores',
              'villa dos acores',
              'viva trindade',
              'opus agronômica',
              'opus agronomica',
              'essenzia canasvieiras',
              'condomínio fly ville',
              'fly ville',
              'luminare residence',
              'luminare',
            ]

            for (var piiU = 0; piiU < activeProperties.length; piiU++) {
              const propRec2 = activeProperties[piiU]
              const pTitle = (propRec2.getString('title') || '').toLowerCase()
              let matchedTerm = false
              for (var kiU = 0; kiU < keyTerms.length; kiU++) {
                const kw = keyTerms[kiU]
                if (pTitle.indexOf(kw) !== -1 && combinedInspection.indexOf(kw) !== -1) {
                  matchedTerm = true
                  break
                }
              }
              if (matchedTerm) {
                detectedPropertyId = propRec2.id
                if (!detectedEnterprise) {
                  detectedEnterprise = propRec2.getString('title') || propRec2.getString('code')
                }
                break
              }
            }
          }
        }
      } catch (detectErr2) {
        console.warn('[AI_KNOWLEDGE_FILES] Erro na detecção em update: ' + String(detectErr2))
      }
    }

    if (!detectedEnterprise) {
      if (combinedInspection.indexOf('vistage') !== -1) {
        detectedEnterprise = 'Vistage Residence'
      } else if (
        combinedInspection.indexOf('viva trindade') !== -1 ||
        combinedInspection.indexOf('viva_trindade') !== -1
      ) {
        detectedEnterprise = 'Viva Trindade'
      } else if (
        combinedInspection.indexOf('neo continente') !== -1 ||
        combinedInspection.indexOf('neo_continente') !== -1
      ) {
        detectedEnterprise = 'Neo Continente'
      } else if (
        combinedInspection.indexOf('viva balne') !== -1 ||
        combinedInspection.indexOf('viva_balne') !== -1
      ) {
        detectedEnterprise = 'Viva Balneário Estreito'
      } else if (combinedInspection.indexOf('essenzia') !== -1) {
        detectedEnterprise = 'Essenzia Canasvieiras'
      } else if (
        combinedInspection.indexOf('terr') !== -1 ||
        combinedInspection.indexOf('jurere') !== -1
      ) {
        detectedEnterprise = 'Terrá Jurerê'
      } else if (combinedInspection.indexOf('opus') !== -1) {
        detectedEnterprise = 'Opus Agronômica'
      } else if (combinedInspection.indexOf('sophia') !== -1) {
        detectedEnterprise = 'Residencial Sophia'
      } else if (
        combinedInspection.indexOf('colina') !== -1 ||
        combinedInspection.indexOf('são pedro') !== -1 ||
        combinedInspection.indexOf('sao pedro') !== -1
      ) {
        detectedEnterprise = 'Colinas de São Pedro'
      } else if (
        combinedInspection.indexOf('fly ville') !== -1 ||
        combinedInspection.indexOf('fly_ville') !== -1
      ) {
        detectedEnterprise = 'Condomínio Fly Ville'
      } else if (
        combinedInspection.indexOf('solar plaza') !== -1 ||
        combinedInspection.indexOf('solar di plaza') !== -1 ||
        combinedInspection.indexOf('solar_plaza') !== -1
      ) {
        detectedEnterprise = 'Solar Plaza'
      } else if (combinedInspection.indexOf('nova governador') !== -1) {
        detectedEnterprise = 'Nova Governador Celso Ramos'
      } else if (combinedInspection.indexOf('luminare') !== -1) {
        detectedEnterprise = 'Luminare Residence'
      }
    }

    const fileSize = record.getInt('file_size') || 0
    const isTrashFile = fileSize === 0

    let fileSummary = record.getString('summary') || ''
    if (!fileSummary && extractedMarkdown.startsWith('[PDF visual, sem texto extraível]')) {
      fileSummary =
        'Material visual e renders do empreendimento (' +
        (detectedEnterprise || originalName) +
        '). Contém imagens, plantas e material gráfico.'
    }

    if (
      (extractedMarkdown && extractedMarkdown !== currentExtracted) ||
      (detectedPropertyId && !record.getString('property_id')) ||
      (detectedEnterprise && !record.getString('enterprise')) ||
      isTrashFile ||
      fileSummary
    ) {
      try {
        const recToUpdate = $app.findRecordById('ai_knowledge_files', record.id)
        if (extractedMarkdown && extractedMarkdown !== currentExtracted) {
          recToUpdate.set('extracted_text', extractedMarkdown.trim())
        }
        if (detectedPropertyId && !record.getString('property_id')) {
          recToUpdate.set('property_id', detectedPropertyId)
        }
        if (detectedEnterprise && !record.getString('enterprise')) {
          recToUpdate.set('enterprise', detectedEnterprise)
        }
        if (fileSummary && !record.getString('summary')) {
          recToUpdate.set('summary', fileSummary)
        }
        if (isTrashFile) {
          recToUpdate.set('is_active', false)
        }
        $app.saveNoValidate(recToUpdate)
      } catch (saveErr) {
        console.error('[AI_KNOWLEDGE_FILES] Update save error: ' + String(saveErr))
      }
    }
  } catch (outerUpdateErr) {
    console.error(
      '[AI_KNOWLEDGE_FILES] Uncaught error in onRecordAfterUpdateSuccess (non-blocking): ' +
        String(outerUpdateErr),
    )
  }

  return e.next()
}, 'ai_knowledge_files')

/**
 * Endpoint para reprocessar e auto-organizar todos os arquivos de conhecimento da IA
 * (útil para organizar em massa arquivos antigos ou recém-migrados no respectivo dossiê)
 * POST /backend/v1/ai-knowledge/auto-organize
 */
routerAdd('POST', '/backend/v1/ai-knowledge/auto-organize', (c) => {
  try {
    const authRecord = c.requestInfo().auth
    if (!authRecord) {
      return c.json(401, { error: 'Não autorizado.' })
    }

    const files = $app.findRecordsByFilter('ai_knowledge_files', '', '-created', 500, 0)
    const activeProperties = $app.findRecordsByFilter(
      'properties',
      'is_active = true',
      'code',
      200,
      0,
    )

    let updatedCount = 0

    for (let i = 0; i < files.length; i++) {
      const rec = files[i]
      let dirty = false
      let currentPropId = (rec.getString('property_id') || '').trim()
      let currentEnterprise = (rec.getString('enterprise') || '').trim()
      const originalName = rec.getString('name') || rec.getString('file') || ''
      const extractedText = rec.getString('extracted_text') || ''
      const combined = (originalName + ' ' + extractedText).toLowerCase()
      const alphanum = combined.replace(/[^a-z0-9]/g, '')

      if (!currentPropId && activeProperties && activeProperties.length > 0) {
        for (let j = 0; j < activeProperties.length; j++) {
          const prop = activeProperties[j]
          const rawCode = (prop.getString('code') || '').toLowerCase().trim()
          if (!rawCode || rawCode.length < 2) continue
          const codeClean = rawCode.replace(/[^a-z0-9]/g, '')
          if (
            codeClean.length >= 2 &&
            (alphanum.indexOf(codeClean) !== -1 || combined.indexOf(rawCode) !== -1)
          ) {
            currentPropId = prop.id
            if (!currentEnterprise) {
              currentEnterprise = prop.getString('title') || prop.getString('code')
            }
            break
          }
        }

        if (!currentPropId) {
          const keyTerms = [
            'vistage',
            'viva balneário',
            'viva balneario',
            'neo continente',
            'colinas de são pedro',
            'colinas de sao pedro',
            'solar di plaza',
            'solar plaza',
            'villa dos açores',
            'villa dos acores',
            'viva trindade',
            'opus agronômica',
            'opus agronomica',
            'essenzia canasvieiras',
            'luminare residence',
            'luminare',
          ]

          for (let k = 0; k < activeProperties.length; k++) {
            const prop2 = activeProperties[k]
            const pTitle = (prop2.getString('title') || '').toLowerCase()
            let matched = false
            for (let t = 0; t < keyTerms.length; t++) {
              if (pTitle.indexOf(keyTerms[t]) !== -1 && combined.indexOf(keyTerms[t]) !== -1) {
                matched = true
                break
              }
            }
            if (matched) {
              currentPropId = prop2.id
              if (!currentEnterprise) {
                currentEnterprise = prop2.getString('title') || prop2.getString('code')
              }
              break
            }
          }
        }
      }

      if (!currentEnterprise) {
        if (combined.indexOf('vistage') !== -1) currentEnterprise = 'Vistage Residence'
        else if (combined.indexOf('viva trindade') !== -1) currentEnterprise = 'Viva Trindade'
        else if (
          combined.indexOf('solar plaza') !== -1 ||
          combined.indexOf('solar di plaza') !== -1
        )
          currentEnterprise = 'Solar Plaza'
        else if (combined.indexOf('nova governador') !== -1)
          currentEnterprise = 'Nova Governador Celso Ramos'
        else if (combined.indexOf('luminare') !== -1) currentEnterprise = 'Luminare Residence'
        else currentEnterprise = 'Geral / Institucional'
      }

      if (currentPropId && currentPropId !== rec.getString('property_id')) {
        rec.set('property_id', currentPropId)
        dirty = true
      }
      if (currentEnterprise && currentEnterprise !== rec.getString('enterprise')) {
        rec.set('enterprise', currentEnterprise)
        dirty = true
      }

      if (dirty) {
        $app.saveNoValidate(rec)
        updatedCount++
      }
    }

    return c.json(200, {
      success: true,
      message:
        'Auto-organização concluída: ' +
        updatedCount +
        ' arquivo(s) organizados nos dossiês de imóveis.',
      updated_count: updatedCount,
    })
  } catch (err) {
    return c.json(500, { error: 'Falha na auto-organização: ' + String(err) })
  }
})

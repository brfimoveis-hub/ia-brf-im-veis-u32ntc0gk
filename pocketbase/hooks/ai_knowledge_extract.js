/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para extração automática de texto em arquivos de conhecimento da IA,
 * auto-classificação de empreendimento e desativação automática de tabelas antigas.
 * Nota: Toda lógica fica inline dentro do callback para evitar problemas de escopo no Goja/PocketBase.
 */
onRecordAfterCreateSuccess((e) => {
  const record = e.record
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
      if (docResult && docResult.markdown) {
        extractedMarkdown = docResult.markdown
      }
    } catch (docErr) {
      console.warn('[AI_KNOWLEDGE_FILES] $documents.toMarkdown failed: ' + String(docErr))
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
      const fileUrl = pbUrl + '/api/files/' + record.collectionId + '/' + record.id + '/' + fileName
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

  // 4. Identificar Empreendimento (Auto-classificação) se ainda não preenchido
  let detectedEnterprise = (record.getString('enterprise') || '').trim()
  const combinedInspection = (originalName + ' ' + extractedMarkdown).toLowerCase()

  if (!detectedEnterprise) {
    if (combinedInspection.includes('vistage')) {
      detectedEnterprise = 'Vistage Residence'
    } else if (
      combinedInspection.includes('viva trindade') ||
      combinedInspection.includes('viva_trindade')
    ) {
      detectedEnterprise = 'Viva Trindade'
    } else if (
      combinedInspection.includes('neo continente') ||
      combinedInspection.includes('neo_continente')
    ) {
      detectedEnterprise = 'Neo Continente'
    } else if (
      combinedInspection.includes('viva balne') ||
      combinedInspection.includes('viva_balne')
    ) {
      detectedEnterprise = 'Viva Balneário Estreito'
    } else if (combinedInspection.includes('essenzia')) {
      detectedEnterprise = 'Essenzia Canasvieiras'
    } else if (combinedInspection.includes('terr') || combinedInspection.includes('jurere')) {
      detectedEnterprise = 'Terrá Jurerê'
    } else if (combinedInspection.includes('opus')) {
      detectedEnterprise = 'Opus Agronômica'
    } else if (combinedInspection.includes('sophia')) {
      detectedEnterprise = 'Residencial Sophia'
    } else if (
      combinedInspection.includes('colina') ||
      combinedInspection.includes('são pedro') ||
      combinedInspection.includes('sao pedro')
    ) {
      detectedEnterprise = 'Colinas de São Pedro'
    } else if (
      combinedInspection.includes('fly ville') ||
      combinedInspection.includes('fly_ville')
    ) {
      detectedEnterprise = 'Condomínio Fly Ville'
    } else if (
      combinedInspection.includes('solar plaza') ||
      combinedInspection.includes('solar di plaza') ||
      combinedInspection.includes('solar_plaza')
    ) {
      detectedEnterprise = 'Solar Plaza'
    } else if (combinedInspection.includes('nova governador')) {
      detectedEnterprise = 'Nova Governador Celso Ramos'
    } else if (combinedInspection.includes('luminare')) {
      detectedEnterprise = 'Luminare Residence'
    } else if (
      combinedInspection.includes('polo empresarial') ||
      combinedInspection.includes('pegf')
    ) {
      detectedEnterprise = 'Polo Empresarial Grande Florianópolis'
    }
  }

  // Se o arquivo tiver 0 bytes ou for vazio sem texto, desativar automaticamente
  const fileSize = record.getInt('file_size') || 0
  const isTrashFile = fileSize === 0 && !extractedMarkdown

  // 5. Salva dados extraídos e atualizados
  try {
    const recToUpdate = $app.findRecordById('ai_knowledge_files', record.id)
    if (extractedMarkdown && extractedMarkdown.trim()) {
      recToUpdate.set('extracted_text', extractedMarkdown.trim())
    }

    if (detectedEnterprise) {
      recToUpdate.set('enterprise', detectedEnterprise)
    }

    if (isTrashFile) {
      recToUpdate.set('is_active', false)
    } else if (record.get('is_active') === null || record.get('is_active') === undefined) {
      recToUpdate.set('is_active', true)
    }

    $app.saveNoValidate(recToUpdate)
    console.log(
      '[AI_KNOWLEDGE_FILES] Processed record=' +
        record.id +
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
        console.warn('[AI_KNOWLEDGE_FILES] Error deactivating previous tables: ' + String(deactErr))
      }
    }
  } catch (saveErr) {
    console.error('[AI_KNOWLEDGE_FILES] Error updating record: ' + String(saveErr))
  }

  return e.next()
}, 'ai_knowledge_files')

onRecordAfterUpdateSuccess((e) => {
  const record = e.record
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
        if (docResult && docResult.markdown) {
          extractedMarkdown = docResult.markdown
        }
      } catch (docErr) {
        console.warn('[AI_KNOWLEDGE_FILES] $documents.toMarkdown failed: ' + String(docErr))
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

  // Auto-classificação caso enterprise esteja em branco
  let detectedEnterprise = (record.getString('enterprise') || '').trim()
  const combinedInspection = (originalName + ' ' + extractedMarkdown).toLowerCase()

  if (!detectedEnterprise) {
    if (combinedInspection.includes('vistage')) {
      detectedEnterprise = 'Vistage Residence'
    } else if (
      combinedInspection.includes('viva trindade') ||
      combinedInspection.includes('viva_trindade')
    ) {
      detectedEnterprise = 'Viva Trindade'
    } else if (
      combinedInspection.includes('neo continente') ||
      combinedInspection.includes('neo_continente')
    ) {
      detectedEnterprise = 'Neo Continente'
    } else if (
      combinedInspection.includes('viva balne') ||
      combinedInspection.includes('viva_balne')
    ) {
      detectedEnterprise = 'Viva Balneário Estreito'
    } else if (combinedInspection.includes('essenzia')) {
      detectedEnterprise = 'Essenzia Canasvieiras'
    } else if (combinedInspection.includes('terr') || combinedInspection.includes('jurere')) {
      detectedEnterprise = 'Terrá Jurerê'
    } else if (combinedInspection.includes('opus')) {
      detectedEnterprise = 'Opus Agronômica'
    } else if (combinedInspection.includes('sophia')) {
      detectedEnterprise = 'Residencial Sophia'
    } else if (
      combinedInspection.includes('colina') ||
      combinedInspection.includes('são pedro') ||
      combinedInspection.includes('sao pedro')
    ) {
      detectedEnterprise = 'Colinas de São Pedro'
    } else if (
      combinedInspection.includes('fly ville') ||
      combinedInspection.includes('fly_ville')
    ) {
      detectedEnterprise = 'Condomínio Fly Ville'
    } else if (
      combinedInspection.includes('solar plaza') ||
      combinedInspection.includes('solar di plaza') ||
      combinedInspection.includes('solar_plaza')
    ) {
      detectedEnterprise = 'Solar Plaza'
    } else if (combinedInspection.includes('nova governador')) {
      detectedEnterprise = 'Nova Governador Celso Ramos'
    } else if (combinedInspection.includes('luminare')) {
      detectedEnterprise = 'Luminare Residence'
    }
  }

  const fileSize = record.getInt('file_size') || 0
  const isTrashFile = fileSize === 0 && !extractedMarkdown

  if (
    (extractedMarkdown && extractedMarkdown !== currentExtracted) ||
    detectedEnterprise ||
    isTrashFile
  ) {
    try {
      const recToUpdate = $app.findRecordById('ai_knowledge_files', record.id)
      if (extractedMarkdown && extractedMarkdown !== currentExtracted) {
        recToUpdate.set('extracted_text', extractedMarkdown.trim())
      }
      if (detectedEnterprise && !record.getString('enterprise')) {
        recToUpdate.set('enterprise', detectedEnterprise)
      }
      if (isTrashFile) {
        recToUpdate.set('is_active', false)
      }
      $app.saveNoValidate(recToUpdate)
    } catch (saveErr) {
      console.error('[AI_KNOWLEDGE_FILES] Update save error: ' + String(saveErr))
    }
  }

  return e.next()
}, 'ai_knowledge_files')

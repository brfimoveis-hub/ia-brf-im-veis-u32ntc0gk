routerAdd('POST', '/backend/v1/rag-search', (e) => {
  const token = e.request.header.get('Authorization')
  const localSecret = 'Bearer internal-rag-token-123'
  if (token !== localSecret) {
    return e.unauthorizedError('Invalid internal token')
  }

  const body = e.requestInfo().body || {}
  const query = body.query
  const userId = body.userId
  const propertyId = body.propertyId || body.property_id || ''
  const propertyCode = body.propertyCode || body.property_code || ''

  if (!query || !userId) return e.badRequestError('Missing query or userId')

  let kbItems = []
  let propertyDossier = null

  try {
    // 0. Se propertyId ou propertyCode foram informados, tentar resolver o imóvel e construir dossiê enriquecido
    let targetPropRecord = null
    if (propertyId) {
      try {
        targetPropRecord = $app.findRecordById('properties', propertyId)
      } catch (_) {}
    }
    if (!targetPropRecord && propertyCode) {
      try {
        const cleanCode = String(propertyCode).replace(/^#/, '').trim()
        const propList = $app.findRecordsByFilter(
          'properties',
          `code = '${cleanCode}' || code = '${propertyCode}'`,
          '-created',
          1,
          0,
        )
        if (propList && propList.length > 0) {
          targetPropRecord = propList[0]
        }
      } catch (_) {}
    }

    // 1. Busca em bia_learnings com filtro is_active = true, sort -priority,-created, limite 30
    // Mapeando title e rule_text com prefixo [Regra Bia P<priority>]
    const learnings = $app.findRecordsByFilter(
      'bia_learnings',
      'is_active = true',
      '-priority,-created',
      30,
      0,
    )
    if (learnings && learnings.length > 0) {
      for (var li = 0; li < learnings.length; li++) {
        const lrn = learnings[li]
        const title = lrn.getString('title') || 'Regra Permanente'
        const ruleText = lrn.getString('rule_text') || ''
        const priority = lrn.getInt('priority') || 0
        if (ruleText) {
          kbItems.push({
            title: `[Regra Bia P${priority}] ${title}`,
            content: ruleText,
          })
        }
      }
    }

    // 2. Busca em ai_knowledge_files com isolamento/prioridade por property_id
    const qLower = (query || '').toLowerCase()
    let propertySpecificFiles = []
    let generalFiles = []

    const allKnowledgeFiles = $app.findRecordsByFilter(
      'ai_knowledge_files',
      `user_id = '${userId}' && is_active != false`,
      '-created',
      100,
      0,
    )

    if (allKnowledgeFiles && allKnowledgeFiles.length > 0) {
      const resolvedPropId = targetPropRecord ? targetPropRecord.id : propertyId
      const targetCode = targetPropRecord
        ? (targetPropRecord.getString('code') || '').toLowerCase()
        : (propertyCode || '').toLowerCase()
      const targetTitle = targetPropRecord
        ? (targetPropRecord.getString('title') || '').toLowerCase()
        : ''

      for (var fi = 0; fi < allKnowledgeFiles.length; fi++) {
        const f = allKnowledgeFiles[fi]
        const fPropId = (f.getString('property_id') || '').trim()
        const fEnterprise = (f.getString('enterprise') || '').trim()
        const fName = (f.getString('name') || '').trim()
        const text = f.getString('extracted_text') || ''

        // Classificar: pertence ao imóvel em foco?
        let isForTargetProp = false
        if (resolvedPropId && fPropId && fPropId === resolvedPropId) {
          isForTargetProp = true
        } else if (targetCode || targetTitle) {
          const combinedDocInfo = (fName + ' ' + fEnterprise).toLowerCase()
          if (targetCode && combinedDocInfo.indexOf(targetCode) !== -1) {
            isForTargetProp = true
          } else if (
            targetTitle &&
            ((targetTitle.indexOf('vistage') !== -1 && combinedDocInfo.indexOf('vistage') !== -1) ||
              (targetTitle.indexOf('colinas') !== -1 &&
                combinedDocInfo.indexOf('colinas') !== -1) ||
              (targetTitle.indexOf('opus') !== -1 && combinedDocInfo.indexOf('opus') !== -1))
          ) {
            isForTargetProp = true
          }
        }

        if (isForTargetProp) {
          propertySpecificFiles.push(f)
        } else if (
          (!fPropId &&
            (fEnterprise === 'Geral / Institucional' ||
              fEnterprise === 'Geral / Portfólio' ||
              fEnterprise === '')) ||
          (!resolvedPropId && !fPropId)
        ) {
          generalFiles.push(f)
        }
      }

      // Se temos arquivos vinculados ao imóvel em foco, eles têm prioridade absoluta!
      const filesToProcess =
        propertySpecificFiles.length > 0
          ? propertySpecificFiles.concat(generalFiles.slice(0, 5))
          : allKnowledgeFiles.slice(0, 20)

      for (var fpi = 0; fpi < filesToProcess.length; fpi++) {
        const fRec = filesToProcess[fpi]
        const fileName = fRec.getString('name') || ''
        const enterprise = fRec.getString('enterprise') || ''
        const title = fileName || enterprise || 'Documento de Conhecimento'
        const text = fRec.getString('extracted_text') || ''

        const textMatches =
          !qLower ||
          text.toLowerCase().indexOf(qLower) !== -1 ||
          fileName.toLowerCase().indexOf(qLower) !== -1 ||
          enterprise.toLowerCase().indexOf(qLower) !== -1

        if (text && textMatches) {
          kbItems.push({
            title: enterprise ? `${title} (${enterprise})` : title,
            content: text.length > 2500 ? text.substring(0, 2500) + '...' : text,
            property_id: fRec.getString('property_id') || '',
          })
        }
      }
    }

    // 3. Montar dossiê enriquecido do imóvel em foco se identificado
    if (targetPropRecord) {
      let enrichedDocText = ''
      if (propertySpecificFiles.length > 0) {
        enrichedDocText = propertySpecificFiles
          .map((pf) => {
            const docName = pf.getString('name') || 'Documento Anexo'
            const docTxt = pf.getString('extracted_text') || ''
            return `[DOCUMENTO VINCULADO: ${docName}]\n${docTxt.substring(0, 3000)}`
          })
          .join('\n\n')
      }

      propertyDossier = {
        id: targetPropRecord.id,
        code: targetPropRecord.getString('code'),
        title: targetPropRecord.getString('title'),
        price_formatted: targetPropRecord.getString('price_formatted'),
        city: targetPropRecord.getString('city'),
        neighborhood: targetPropRecord.getString('neighborhood'),
        url: targetPropRecord.getString('url'),
        description: targetPropRecord.getString('description'),
        linked_documents_count: propertySpecificFiles.length,
        enriched_knowledge: enrichedDocText,
      }
    }
  } catch (err) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const errLog = new Record(logsCol)
      errLog.set('user_id', userId || '')
      errLog.set('type', 'rag_search_error')
      errLog.set(
        'message',
        'Erro na busca de conhecimento RAG (bia_learnings / ai_knowledge_files)',
      )
      errLog.set('details', String(err))
      $app.saveNoValidate(errLog)
    } catch (_) {}
    $app.logger().error('RAG search error', 'err', err)
  }

  let cadencesItems = []
  try {
    const cadFilter = `user_id = '${userId}' && is_active = true`
    const cadList = $app.findRecordsByFilter('cadences', cadFilter, 'order', 5, 0)
    if (cadList && cadList.length > 0) {
      cadencesItems = cadList
    }
  } catch (err) {
    $app.logger().error('Cadences search error', 'err', err)
  }

  return e.json(200, {
    knowledge_base: kbItems,
    property_dossier: propertyDossier,
    cadences: cadencesItems.map((r) => ({
      title: r.getString('title') || '',
      content: r.getString('content') || '',
      ai_instructions: r.getString('ai_instructions') || '',
    })),
  })
})

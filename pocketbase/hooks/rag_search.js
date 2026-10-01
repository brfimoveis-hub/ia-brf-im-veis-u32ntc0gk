routerAdd('POST', '/backend/v1/rag-search', (e) => {
  const token = e.request.header.get('Authorization')
  const localSecret = 'Bearer internal-rag-token-123'
  if (token !== localSecret) {
    return e.unauthorizedError('Invalid internal token')
  }

  const body = e.requestInfo().body || {}
  const query = body.query
  const userId = body.userId

  if (!query || !userId) return e.badRequestError('Missing query or userId')

  let kbItems = []
  try {
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
      learnings.forEach((lrn) => {
        const title = lrn.getString('title') || 'Regra Permanente'
        const ruleText = lrn.getString('rule_text') || ''
        const priority = lrn.getInt('priority') || 0
        if (ruleText) {
          kbItems.push({
            title: `[Regra Bia P${priority}] ${title}`,
            content: ruleText,
          })
        }
      })
    }

    // 2. Busca em ai_knowledge_files com filtro user_id = '<userId>' && is_active != false, sort -created, limite 20
    // Usando campos name / enterprise / extracted_text (recorte de 2500 chars), filtro por indexOf case-insensitive com query
    const files = $app.findRecordsByFilter(
      'ai_knowledge_files',
      `user_id = '${userId}' && is_active != false`,
      '-created',
      20,
      0,
    )
    if (files && files.length > 0) {
      const qLower = (query || '').toLowerCase()
      files.forEach((f) => {
        const fileName = f.getString('name') || ''
        const enterprise = f.getString('enterprise') || ''
        const title = fileName || enterprise || 'Documento de Conhecimento'
        const text = f.getString('extracted_text') || ''

        const textMatches =
          !qLower ||
          text.toLowerCase().indexOf(qLower) !== -1 ||
          fileName.toLowerCase().indexOf(qLower) !== -1 ||
          enterprise.toLowerCase().indexOf(qLower) !== -1

        if (text && textMatches) {
          kbItems.push({
            title: enterprise ? `${title} (${enterprise})` : title,
            content: text.length > 2500 ? text.substring(0, 2500) + '...' : text,
          })
        }
      })
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
    cadences: cadencesItems.map((r) => ({
      title: r.getString('title') || '',
      content: r.getString('content') || '',
      ai_instructions: r.getString('ai_instructions') || '',
    })),
  })
})

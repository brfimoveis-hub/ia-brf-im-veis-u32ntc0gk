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
    // Busca em ai_knowledge_files por registros ativos do usuário
    const files = $app.findRecordsByFilter(
      'ai_knowledge_files',
      `user_id = '${userId}' && is_active != false`,
      '-created',
      10,
      0,
    )
    if (files && files.length > 0) {
      const qLower = query.toLowerCase()
      files.forEach((f) => {
        const title = f.getString('name') || f.getString('enterprise') || ''
        const text = f.getString('extracted_text') || ''
        if (
          text &&
          (!qLower ||
            text.toLowerCase().indexOf(qLower) !== -1 ||
            title.toLowerCase().indexOf(qLower) !== -1)
        ) {
          kbItems.push({
            title: title,
            content: text.length > 2000 ? text.substring(0, 2000) + '...' : text,
          })
        }
      })
    }
  } catch (err) {
    $app.logger().error('KB files search error', 'err', err)
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

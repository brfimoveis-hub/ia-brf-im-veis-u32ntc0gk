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
    const kbResults = $vectors.search(e, 'knowledge_base', {
      field: 'embedding',
      query: query,
      k: 3,
      filter: `user_id = '${userId}'`,
    })
    if (kbResults && kbResults.items) kbItems = kbResults.items
  } catch (err) {
    $app.logger().error('KB Vec search error', 'err', err)
  }

  let cadencesItems = []
  try {
    const cadResults = $vectors.search(e, 'cadences', {
      field: 'embedding',
      query: query,
      k: 2,
      filter: `user_id = '${userId}'`,
    })
    if (cadResults && cadResults.items) cadencesItems = cadResults.items
  } catch (err) {
    $app.logger().error('Cadences Vec search error', 'err', err)
  }

  return e.json(200, {
    knowledge_base: kbItems.map((r) => ({
      title: r.getString('title'),
      content: r.getString('content'),
    })),
    cadences: cadencesItems.map((r) => ({
      title: r.getString('title'),
      content: r.getString('content'),
      ai_instructions: r.getString('ai_instructions'),
    })),
  })
})

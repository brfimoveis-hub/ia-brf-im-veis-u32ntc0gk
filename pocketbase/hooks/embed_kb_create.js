onRecordAfterCreateSuccess((e) => {
  const title = e.record.getString('title') || ''
  const content = e.record.getString('content') || ''
  const category = e.record.getString('category') || ''
  const text = (title + '\n\n' + content + '\n\nCategoria: ' + category).trim()
  if (!text) return e.next()

  const apiKey = $secrets.get('OPENAI_API_KEY')
  if (!apiKey) {
    $app.logger().warn('OPENAI_API_KEY not set, skipping KB embedding')
    return e.next()
  }

  const res = $http.send({
    url: 'https://api.openai.com/v1/embeddings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    timeout: 30,
  })

  if (res.statusCode !== 200) {
    $app.logger().error('KB embedding failed', 'status', res.statusCode)
    return e.next()
  }

  const record = $app.findRecordById('knowledge_base', e.record.id)
  record.set('embedding', res.json.data[0].embedding)
  $app.save(record)
  return e.next()
}, 'knowledge_base')

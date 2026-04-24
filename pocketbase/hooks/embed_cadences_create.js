onRecordAfterCreateSuccess((e) => {
  const title = e.record.getString('title') || ''
  const content = e.record.getString('content') || ''
  const ai_instructions = e.record.getString('ai_instructions') || ''
  const text = (title + '\n\n' + content + '\n\nInstruções: ' + ai_instructions).trim()
  if (!text) return e.next()

  const apiKey = $secrets.get('OPENAI_API_KEY')
  if (!apiKey) return e.next()

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

  if (res.statusCode !== 200) return e.next()

  const record = $app.findRecordById('cadences', e.record.id)
  record.set('embedding', res.json.data[0].embedding)
  $app.save(record)
  return e.next()
}, 'cadences')

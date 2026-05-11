routerAdd('GET', '/backend/v1/webhook/whatsapp', (e) => {
  const mode = e.request.url.query().get('hub.mode')
  const token = e.request.url.query().get('hub.verify_token')
  const challenge = e.request.url.query().get('hub.challenge')

  if (mode === 'subscribe' && token) {
    try {
      const users = $app.findRecordsByFilter(
        'users',
        'meta_whatsapp_verify_token = {:token}',
        '',
        1,
        0,
        { token },
      )
      if (users && users.length > 0) {
        return e.string(200, challenge || '')
      } else {
        return e.string(403, 'Forbidden')
      }
    } catch (err) {
      return e.string(403, 'Forbidden')
    }
  }

  return e.string(400, 'Bad Request')
})

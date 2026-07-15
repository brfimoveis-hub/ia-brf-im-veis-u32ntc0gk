routerAdd('GET', '/backend/v1/meta_whatsapp_webhook', (e) => {
  const query = e.requestInfo().query || {}
  const mode = query['hub.mode']
  const token = query['hub.verify_token']
  const challenge = query['hub.challenge']
  const userId = query['user_id'] || query['uid'] || ''

  if (mode !== 'subscribe' || !token || !userId) {
    return e.string(400, 'Bad Request')
  }

  try {
    const user = $app.findRecordById('users', userId)
    if (!user) {
      return e.string(403, 'Forbidden')
    }
    const storedToken = user.getString('meta_whatsapp_verify_token') || ''
    if (storedToken && storedToken === token) {
      return e.string(200, challenge || '')
    }
    return e.string(403, 'Forbidden')
  } catch (err) {
    return e.string(403, 'Forbidden')
  }
})

routerAdd('GET', '/backend/v1/meta_whatsapp_webhook', (e) => {
  const query = e.requestInfo().query || {}
  const mode = query['hub.mode']
  const token = query['hub.verify_token']
  const challenge = query['hub.challenge']
  const userId = query['user_id'] || query['uid'] || ''

  if (mode !== 'subscribe') {
    return e.string(403, 'Forbidden: hub.mode must be "subscribe"')
  }
  if (!userId) {
    return e.string(
      403,
      'Forbidden: missing user_id parameter. Add ?user_id=<your-id> to the callback URL.',
    )
  }
  if (!token) {
    return e.string(403, 'Forbidden: missing hub.verify_token parameter')
  }

  try {
    let user
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {
      return e.string(403, 'Forbidden: user not found for the provided user_id')
    }

    const storedToken = user.getString('meta_whatsapp_verify_token') || ''
    if (!storedToken) {
      return e.string(
        403,
        'Forbidden: no verification token configured. Go to Settings > Connections and set a verify token first.',
      )
    }

    if (storedToken === token) {
      return e.string(200, challenge || '')
    }

    return e.string(
      403,
      'Forbidden: the verify token does not match the token stored in the system. Copy the exact token from Settings > Connections and paste it into the Meta Developer Portal "Verify Token" field.',
    )
  } catch (err) {
    return e.string(403, 'Forbidden: unexpected error during verification')
  }
})

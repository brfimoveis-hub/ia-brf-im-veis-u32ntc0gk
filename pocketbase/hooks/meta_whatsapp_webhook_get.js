// Hook para GET /backend/v1/meta_whatsapp_webhook
// Todas as funções e variáveis devem estar inline dentro do callback (regra de escopo do PocketBase JSVM)

routerAdd('GET', '/backend/v1/meta_whatsapp_webhook', (e) => {
  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var mode = query['hub.mode'] || ''
  var token = query['hub.verify_token'] || ''
  var challenge = query['hub.challenge'] || ''
  var userId = query['user_id'] || query['uid'] || ''

  // Fallback: se os parâmetros hub.* vierem nos headers
  if (!mode) {
    try {
      var headerMode = e.request.header.get('hub.mode') || e.request.header.get('x-hub-mode') || ''
      if (headerMode) mode = headerMode
    } catch (_) {}
  }
  if (!token) {
    try {
      var headerToken =
        e.request.header.get('hub.verify_token') || e.request.header.get('x-hub-verify-token') || ''
      if (headerToken) token = headerToken
    } catch (_) {}
  }
  if (!challenge) {
    try {
      var headerChallenge =
        e.request.header.get('hub.challenge') || e.request.header.get('x-hub-challenge') || ''
      if (headerChallenge) challenge = headerChallenge
    } catch (_) {}
  }

  // 1. Caso requisição sem parâmetros / ping da Meta
  if (!mode && !token && !challenge) {
    return e.string(200, 'OK')
  }

  if (mode !== 'subscribe') {
    return e.string(403, 'Forbidden: hub.mode must be "subscribe"')
  }

  if (!token) {
    return e.string(403, 'Forbidden: missing hub.verify_token parameter')
  }

  try {
    var user = null

    // Cenário A: userId foi informado no query param
    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }

    // Cenário B: userId não informado ou não encontrado -> buscar na coleção users pelo meta_whatsapp_verify_token
    if (!user) {
      try {
        var matchedUsers = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_verify_token = {:token}',
          'created',
          10,
          0,
          { token: token },
        )
        if (matchedUsers && matchedUsers.length > 0) {
          user = matchedUsers[0]
        }
      } catch (_) {}
    }

    // Cenário C: fallback caso haja exatamente 1 usuário configurado no sistema
    if (!user) {
      try {
        var allUsersWithToken = $app.findRecordsByFilter(
          'users',
          "meta_whatsapp_verify_token != ''",
          'created',
          2,
          0,
        )
        if (allUsersWithToken && allUsersWithToken.length === 1) {
          var candidate = allUsersWithToken[0]
          if (candidate.getString('meta_whatsapp_verify_token') === token) {
            user = candidate
          }
        }
      } catch (_) {}
    }

    if (!user) {
      return e.string(403, 'Forbidden: user not found or verify token does not match any user')
    }

    var storedToken = user.getString('meta_whatsapp_verify_token') || ''
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
      'Forbidden: the verify token does not match the token stored in the system.',
    )
  } catch (err) {
    return e.string(403, 'Forbidden: unexpected error during verification')
  }
})

// Rota complementar com userId no path: GET /backend/v1/meta_whatsapp_webhook/{userId}
routerAdd('GET', '/backend/v1/meta_whatsapp_webhook/{userId}', (e) => {
  var pathUserId = ''
  try {
    pathUserId = e.request.pathValue('userId') || ''
  } catch (_) {}

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var mode = query['hub.mode'] || ''
  var token = query['hub.verify_token'] || ''
  var challenge = query['hub.challenge'] || ''
  var userId = pathUserId || query['user_id'] || query['uid'] || ''

  if (!mode) {
    try {
      var headerMode = e.request.header.get('hub.mode') || e.request.header.get('x-hub-mode') || ''
      if (headerMode) mode = headerMode
    } catch (_) {}
  }
  if (!token) {
    try {
      var headerToken =
        e.request.header.get('hub.verify_token') || e.request.header.get('x-hub-verify-token') || ''
      if (headerToken) token = headerToken
    } catch (_) {}
  }
  if (!challenge) {
    try {
      var headerChallenge =
        e.request.header.get('hub.challenge') || e.request.header.get('x-hub-challenge') || ''
      if (headerChallenge) challenge = headerChallenge
    } catch (_) {}
  }

  if (!mode && !token && !challenge) {
    return e.string(200, 'OK')
  }

  if (mode !== 'subscribe') {
    return e.string(403, 'Forbidden: hub.mode must be "subscribe"')
  }

  if (!token) {
    return e.string(403, 'Forbidden: missing hub.verify_token parameter')
  }

  try {
    var user = null

    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }

    if (!user) {
      try {
        var matchedUsers = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_verify_token = {:token}',
          'created',
          10,
          0,
          { token: token },
        )
        if (matchedUsers && matchedUsers.length > 0) {
          user = matchedUsers[0]
        }
      } catch (_) {}
    }

    if (!user) {
      return e.string(403, 'Forbidden: user not found or verify token does not match any user')
    }

    var storedToken = user.getString('meta_whatsapp_verify_token') || ''
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
      'Forbidden: the verify token does not match the token stored in the system.',
    )
  } catch (err) {
    return e.string(403, 'Forbidden: unexpected error during verification')
  }
})

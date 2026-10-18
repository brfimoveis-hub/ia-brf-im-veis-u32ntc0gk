// Hook para GET /backend/v1/instagram/webhook e GET /backend/v1/instagram/webhook/{userId}
// Validação do webhook da Meta (Instagram Messaging API / Webhooks)
// Todas as funções e variáveis inline (regra de escopo do PocketBase JSVM)

routerAdd('GET', '/backend/v1/instagram/webhook', (e) => {
  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var mode = query['hub.mode'] || ''
  var token = query['hub.verify_token'] || ''
  var challenge = query['hub.challenge'] || ''
  var userId = query['user_id'] || query['uid'] || ''

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

  // Ping da Meta sem parâmetros
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
      try {
        var allUsers = $app.findRecordsByFilter('users', "email != ''", 'created', 2, 0)
        if (allUsers && allUsers.length === 1) {
          var singleUser = allUsers[0]
          var stored = singleUser.getString('meta_whatsapp_verify_token') || ''
          if (stored === token || !stored) {
            user = singleUser
          }
        }
      } catch (_) {}
    }

    if (!user) {
      return e.string(403, 'Forbidden: user not found or verify token does not match')
    }

    var storedToken = user.getString('meta_whatsapp_verify_token') || ''
    if (storedToken && storedToken !== token) {
      return e.string(403, 'Forbidden: verify token mismatch')
    }

    return e.string(200, challenge || '')
  } catch (err) {
    return e.string(403, 'Forbidden: error during verification')
  }
})

// Rota com userId no path: GET /backend/v1/instagram/webhook/{userId}
routerAdd('GET', '/backend/v1/instagram/webhook/{userId}', (e) => {
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

  try {
    var user = null
    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }

    if (!user) {
      try {
        var matched = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_verify_token = {:token}',
          'created',
          2,
          0,
          { token: token },
        )
        if (matched && matched.length > 0) user = matched[0]
      } catch (_) {}
    }

    if (!user) {
      return e.string(403, 'Forbidden')
    }

    var storedToken = user.getString('meta_whatsapp_verify_token') || ''
    if (storedToken && storedToken !== token) {
      return e.string(403, 'Forbidden: token mismatch')
    }

    return e.string(200, challenge || '')
  } catch (_) {
    return e.string(403, 'Forbidden')
  }
})

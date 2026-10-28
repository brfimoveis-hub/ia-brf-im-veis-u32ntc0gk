// Hook para GET /backend/v1/messenger/webhook e GET /backend/v1/messenger/webhook/{userId}
// Suporte ao handshake de verificação de Webhook do Facebook Messenger (objeto Page da Meta)
//
// Parâmetros enviados pela Meta no handshake GET:
// - hub.mode: sempre "subscribe"
// - hub.verify_token: o token configurado no painel da Meta App (padrão: "BRF IA CRM")
// - hub.challenge: string aleatória que deve ser devolvida pura (status 200)
//
// A Meta NUNCA envia user_id no handshake. Portanto, o endpoint aceita o handshake sem user_id,
// comparando contra o token padrão "BRF IA CRM", tokens dos usuários cadastrados no CRM
// e também suporta a query user_id/uid legada para retrocompatibilidade.

function handleMessengerWebhookGet(e) {
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

  // Ping sem parâmetros
  if (!mode && !token && !challenge) {
    return e.string(200, 'OK')
  }

  if (mode !== 'subscribe') {
    return e.string(403, 'Forbidden: hub.mode must be "subscribe"')
  }

  if (!token) {
    return e.string(403, 'Forbidden: missing hub.verify_token parameter')
  }

  // Tokens aceitos: padrão do projeto e variações
  var acceptedTokens = ['BRF IA CRM', 'BRFIACRM', 'BRF_IA_CRM', 'brf_ia_crm', 'brf-ia-crm']

  // Cenário 1: userId explícito na query
  if (userId) {
    try {
      var explicitUser = $app.findRecordById('users', userId)
      if (explicitUser) {
        var ut = explicitUser.getString('meta_whatsapp_verify_token')
        if (ut && acceptedTokens.indexOf(ut) === -1) {
          acceptedTokens.push(ut)
        }
      }
    } catch (_) {}
  }

  // Cenário 2: carregar tokens salvos dos usuários do CRM
  try {
    var usersWithToken = $app.findRecordsByFilter(
      'users',
      "meta_whatsapp_verify_token != ''",
      'created',
      5,
      0,
    )
    for (var u of usersWithToken) {
      var t = u.getString('meta_whatsapp_verify_token')
      if (t && acceptedTokens.indexOf(t) === -1) {
        acceptedTokens.push(t)
      }
    }
  } catch (_) {}

  // Validação do token (case-insensitive e trim)
  var tokenNorm = (token || '').trim().toLowerCase()
  var matchFound = false

  for (var candidate of acceptedTokens) {
    if (tokenNorm === candidate.trim().toLowerCase()) {
      matchFound = true
      break
    }
  }

  if (!matchFound) {
    $app
      .logger()
      .warn(
        'Messenger Webhook Handshake Rejeitado: token incorreto',
        'received',
        token,
        'user_id',
        userId,
      )
    return e.string(403, 'Forbidden: invalid verify_token')
  }

  $app
    .logger()
    .info('Messenger Webhook Handshake Aprovado!', 'challenge_len', (challenge || '').length)

  return e.string(200, challenge || '')
}

function handleMessengerWebhookGetWithPathUser(e) {
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
  var queryUserId = query['user_id'] || query['uid'] || ''
  var effectiveUserId = pathUserId || queryUserId || ''

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

  var acceptedTokens = ['BRF IA CRM', 'BRFIACRM', 'BRF_IA_CRM', 'brf_ia_crm', 'brf-ia-crm']

  if (effectiveUserId) {
    try {
      var explicitUser = $app.findRecordById('users', effectiveUserId)
      if (explicitUser) {
        var ut = explicitUser.getString('meta_whatsapp_verify_token')
        if (ut && acceptedTokens.indexOf(ut) === -1) {
          acceptedTokens.push(ut)
        }
      }
    } catch (_) {}
  }

  try {
    var usersWithToken = $app.findRecordsByFilter(
      'users',
      "meta_whatsapp_verify_token != ''",
      'created',
      5,
      0,
    )
    for (var u of usersWithToken) {
      var t = u.getString('meta_whatsapp_verify_token')
      if (t && acceptedTokens.indexOf(t) === -1) {
        acceptedTokens.push(t)
      }
    }
  } catch (_) {}

  var tokenNorm = (token || '').trim().toLowerCase()
  var matchFound = false

  for (var candidate of acceptedTokens) {
    if (tokenNorm === candidate.trim().toLowerCase()) {
      matchFound = true
      break
    }
  }

  if (!matchFound) {
    return e.string(403, 'Forbidden: invalid verify_token')
  }

  return e.string(200, challenge || '')
}

// Rota original sob /backend/v1/
routerAdd('GET', '/backend/v1/messenger/webhook', handleMessengerWebhookGet)
routerAdd('GET', '/backend/v1/messenger/webhook/{userId}', handleMessengerWebhookGetWithPathUser)

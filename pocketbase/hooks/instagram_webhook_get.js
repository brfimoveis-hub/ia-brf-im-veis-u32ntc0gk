// Hook para GET /backend/v1/instagram/webhook e GET /backend/v1/instagram/webhook/{userId}
// Validação do handshake de Webhooks do Instagram / Meta Messenger
//
// Parâmetros enviados pela Meta no GET:
// - hub.mode: sempre "subscribe"
// - hub.verify_token: o token configurado no painel da Meta App
// - hub.challenge: string aleatória que deve ser devolvida pura (status 200)

routerAdd('GET', '/backend/v1/instagram/webhook', (e) => {
  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var mode = query['hub.mode'] || ''
  var token = query['hub.verify_token'] || ''
  var challenge = query['hub.challenge'] || ''
  var queryUserId = query['user_id'] || query['uid'] || ''

  $app
    .logger()
    .info(
      'Instagram Webhook Handshake GET',
      'mode',
      mode,
      'token_received',
      token,
      'user_id',
      queryUserId,
    )

  if (mode !== 'subscribe') {
    return e.string(403, 'Forbidden: mode must be subscribe')
  }

  // Tokens aceitos:
  // 1. O salvo no usuário do CRM (meta_whatsapp_verify_token)
  // 2. O padrão "BRF IA CRM"
  // 3. Variações sem espaços/hífen ("BRFIACRM", "BRF_IA_CRM", "brf_ia_crm")
  var acceptedTokens = ['BRF IA CRM', 'BRFIACRM', 'BRF_IA_CRM', 'brf_ia_crm', 'brf-ia-crm']

  if (queryUserId) {
    try {
      var user = $app.findRecordById('users', queryUserId)
      if (user) {
        var userToken = user.getString('meta_whatsapp_verify_token')
        if (userToken && acceptedTokens.indexOf(userToken) === -1) {
          acceptedTokens.push(userToken)
        }
      }
    } catch (_) {}
  } else {
    // Tenta carregar tokens configurados em todos os usuários
    try {
      var users = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_verify_token != ''",
        'created',
        5,
        0,
      )
      for (var u of users) {
        var ut = u.getString('meta_whatsapp_verify_token')
        if (ut && acceptedTokens.indexOf(ut) === -1) {
          acceptedTokens.push(ut)
        }
      }
    } catch (_) {}
  }

  // Compara ignorando caixa alta/baixa e espaços extras
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
        'Instagram Webhook Handshake Rejeitado: token incorreto',
        'received',
        token,
        'accepted',
        acceptedTokens.join(','),
      )
    return e.string(403, 'Forbidden: invalid verify_token')
  }

  $app.logger().info('Instagram Webhook Handshake Aprovado!', 'challenge_len', challenge.length)
  return e.string(200, challenge)
})

// Endpoint complementar com userId no path: GET /backend/v1/instagram/webhook/{userId}
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
  var queryUserId = query['user_id'] || query['uid'] || ''
  var effectiveUserId = pathUserId || queryUserId || ''

  $app
    .logger()
    .info(
      'Instagram Webhook Handshake GET (path userId)',
      'mode',
      mode,
      'token_received',
      token,
      'user_id',
      effectiveUserId,
    )

  if (mode !== 'subscribe') {
    return e.string(403, 'Forbidden: mode must be subscribe')
  }

  var acceptedTokens = ['BRF IA CRM', 'BRFIACRM', 'BRF_IA_CRM', 'brf_ia_crm', 'brf-ia-crm']

  if (effectiveUserId) {
    try {
      var user = $app.findRecordById('users', effectiveUserId)
      if (user) {
        var userToken = user.getString('meta_whatsapp_verify_token')
        if (userToken && acceptedTokens.indexOf(userToken) === -1) {
          acceptedTokens.push(userToken)
        }
      }
    } catch (_) {}
  }

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
        'Instagram Webhook Handshake Rejeitado (path userId)',
        'received',
        token,
        'user_id',
        effectiveUserId,
      )
    return e.string(403, 'Forbidden: invalid verify_token')
  }

  $app
    .logger()
    .info(
      'Instagram Webhook Handshake Aprovado (path userId)!',
      'challenge_len',
      challenge.length,
      'user_id',
      effectiveUserId,
    )
  return e.string(200, challenge)
})

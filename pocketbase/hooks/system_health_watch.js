// ============================================================================
// VIGIA AUTOMÁTICO BRF IMÓVEIS (FRENTE 2 da auditoria derradeira)
// ----------------------------------------------------------------------------
// 1. Cron a cada 15 min: valida o token de Página na Graph API (GET /me).
//    - Erro 190 / expirado -> system_logs nível error com mensagem clara para
//      a Bernadete renovar em /configuracoes + users.meta_token_status='expired'.
//    - Com data de expiração conhecida (debug_token), avisa 7 dias antes.
// 2. Detecção de webhook silencioso: canal ativo sem eventos há >24h enquanto
//    outro canal recebeu -> aviso no system_logs.
// 3. GET /backend/v1/system_health: JSON com o status de cada canal
//    (WhatsApp/Messenger/Instagram) — NUNCA expõe tokens.
// REGRA DO PROJETO: handlers só referenciam funções/constantes declaradas
// DENTRO deles (a JSVM executa callbacks em pool separado — funções top-level
// podem sumir do bundle, v0.0.1399). TODA a lógica está inline nos callbacks.
// ============================================================================

// ----------------------------------------------------------------------------
// CRON: a cada 15 minutos
// ----------------------------------------------------------------------------
cronAdd('system_health_watch', '*/15 * * * *', () => {
  var nowIso = new Date().toISOString()
  var nowMs = Date.now()
  var GRAPH_V = 'https://graph.facebook.com/v21.0'
  var HEALTH_LOG_TYPE = 'token_health_check'
  var EXPIRED_ALERT_TYPE = 'token_expired_alert'
  var SILENCE_ALERT_TYPE = 'webhook_silence_alert'

  function buildHealthUser() {
    // Escolhe o usuário com credenciais Meta mais recentemente criado.
    var candidates = []
    try {
      candidates = $app.findRecordsByFilter(
        'users',
        "meta_page_access_token != '' || meta_instagram_page_token != '' || meta_whatsapp_access_token != ''",
        '-created',
        5,
        0,
      )
    } catch (_) {}
    var chosen = null
    for (var i = 0; i < candidates.length; i++) {
      var u = candidates[i]
      if (u.getString('meta_page_access_token') || u.getString('meta_instagram_page_token')) {
        chosen = u
        break
      }
    }
    if (!chosen && candidates.length > 0) chosen = candidates[0]
    return chosen
  }

  function graphGet(url, token) {
    var out = { statusCode: 0, body: null }
    try {
      var res = $http.send({
        url: url,
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })
      out.statusCode = res.statusCode
      out.body = res.json !== undefined ? res.json : res.body
    } catch (err) {
      out.statusCode = 0
      out.body = { error: { message: 'Erro de rede: ' + (err.message || String(err)) } }
    }
    return out
  }

  function channelStatusFromGraph(statusCode, body) {
    var errObj = body && body.error ? body.error : {}
    var code = errObj.code !== undefined ? errObj.code : 0
    if (statusCode >= 200 && statusCode < 300) return { status: 'ok', code: 0 }
    if (statusCode === 401 || code === 190) return { status: 'expired', code: code }
    return { status: 'error', code: code }
  }

  function writeHealthLog(logType, level, message, details) {
    try {
      var logsCol = $app.findCollectionByNameOrId('system_logs')
      var log = new Record(logsCol)
      log.set('user_id', details && details.user_id ? details.user_id : '')
      log.set('type', logType)
      log.set('message', message)
      log.set('details', JSON.stringify(details || {}))
      $app.saveNoValidate(log)
    } catch (logErr) {
      console.error('[SYSTEM_HEALTH] Falha ao gravar system_logs: ' + logErr.message)
    }
  }

  function recentAlertExists(logType, withinHours) {
    try {
      var since = new Date(Date.now() - withinHours * 3600000).toISOString().replace('T', ' ')
      var found = $app.findRecordsByFilter(
        'system_logs',
        'type = {:t} && created > {:since}',
        '-created',
        1,
        0,
        { t: logType, since: since },
      )
      return found && found.length > 0
    } catch (_) {
      return false
    }
  }

  function tryFetchTokenExpiry(userRecord) {
    // Só possível com META_APP_ID + META_APP_SECRET (debug_token). Se não houver,
    // retorna null e o vigia usa apenas o status ao vivo.
    var appId = ''
    var appSecret = ''
    try {
      appId = $os.getenv('META_APP_ID') || ''
      appSecret = $os.getenv('META_APP_SECRET') || ''
    } catch (_) {}
    if (!appId || !appSecret) return null
    var token =
      userRecord.getString('meta_page_access_token') ||
      userRecord.getString('meta_instagram_page_token')
    if (!token) return null
    var res = graphGet(
      GRAPH_V + '/debug_token?input_token=' + encodeURIComponent(token),
      appId + '|' + appSecret,
    )
    try {
      var data = res.body && res.body.data ? res.body.data : {}
      if (data.expires_at && data.expires_at > 0) {
        return data.expires_at * 1000
      }
    } catch (_) {}
    return null
  }

  function saveUserTokenStatus(userId, status) {
    try {
      var u = $app.findRecordById('users', userId)
      if (u.getString('meta_token_status') !== status) {
        u.set('meta_token_status', status)
        $app.saveNoValidate(u)
      }
    } catch (_) {}
  }

  function runTokenHealth() {
    var user = buildHealthUser()
    if (!user) {
      return { overall: 'not_configured', checked_at: nowIso, token: null }
    }
    var userId = user.id
    var pageToken =
      user.getString('meta_page_access_token') || user.getString('meta_instagram_page_token')
    var result = {
      overall: 'ok',
      checked_at: nowIso,
      user_id: userId,
      token: null,
    }

    if (!pageToken) {
      result.overall = 'not_configured'
      result.token = { status: 'not_configured', message: 'Nenhum token de Página salvo' }
      return result
    }

    var res = graphGet(GRAPH_V + '/me?fields=id,name', pageToken)
    var verdict = channelStatusFromGraph(res.statusCode, res.body)
    var errObj = res.body && res.body.error ? res.body.error : {}

    if (verdict.status === 'ok') {
      result.token = {
        status: 'ok',
        page_name: res.body && res.body.name ? res.body.name : '',
        page_id: res.body && res.body.id ? res.body.id : '',
        checked_at: nowIso,
      }
      saveUserTokenStatus(userId, 'active')
      writeHealthLog(
        HEALTH_LOG_TYPE,
        'info',
        'Vigia: token de Página OK (' + (res.body && res.body.name ? res.body.name : '') + ')',
        {
          user_id: userId,
          status: 'ok',
          checked_at: nowIso,
        },
      )
    } else if (verdict.status === 'expired') {
      result.overall = 'expired'
      result.token = {
        status: 'expired',
        code: errObj.code !== undefined ? errObj.code : 190,
        message: errObj.message || 'Token inválido/expirado (OAuthException 190)',
        checked_at: nowIso,
      }
      saveUserTokenStatus(userId, 'expired')
      // Dedupe: 1 alerta por hora no máximo.
      if (!recentAlertExists(EXPIRED_ALERT_TYPE, 1)) {
        writeHealthLog(
          EXPIRED_ALERT_TYPE,
          'error',
          'TOKEN META EXPIRADO - leads de anúncios podem se perder - Bernadete deve renovar em /configuracoes',
          {
            user_id: userId,
            graph_code: errObj.code !== undefined ? errObj.code : null,
            graph_subcode: errObj.error_subcode !== undefined ? errObj.error_subcode : null,
            graph_message: errObj.message || null,
            checked_at: nowIso,
          },
        )
      }
      console.error('[SYSTEM_HEALTH] TOKEN META EXPIRADO (code=190) user=' + userId)
    } else {
      result.overall = 'error'
      result.token = {
        status: 'error',
        message: errObj.message || 'HTTP ' + res.statusCode + ' na Graph API',
        checked_at: nowIso,
      }
      writeHealthLog(
        HEALTH_LOG_TYPE,
        'warn',
        'Vigia: erro ao validar token de Página: ' + (errObj.message || 'HTTP ' + res.statusCode),
        {
          user_id: userId,
          status: 'error',
          checked_at: nowIso,
        },
      )
    }

    // Aviso de expiração próxima (7 dias) — só se conseguirmos a data.
    var expiresAtMs = tryFetchTokenExpiry(user)
    if (expiresAtMs && result.token) {
      result.token.expires_at = new Date(expiresAtMs).toISOString()
      var daysLeft = Math.floor((expiresAtMs - Date.now()) / 86400000)
      result.token.days_left = daysLeft
      if (daysLeft <= 7 && daysLeft >= 0 && result.overall !== 'expired') {
        if (!recentAlertExists('token_expiry_warning', 23)) {
          writeHealthLog(
            'token_expiry_warning',
            'warn',
            'Token Meta expira em ' +
              daysLeft +
              ' dia(s) — Bernadete deve renovar em /configuracoes para não perder leads',
            { user_id: userId, expires_at: result.token.expires_at, days_left: daysLeft },
          )
        }
      }
    }
    return result
  }

  function countConversationsSince(channel, sinceMs) {
    try {
      var since = new Date(sinceMs).toISOString().replace('T', ' ')
      var found = $app.findRecordsByFilter(
        'conversations',
        "channel = {:ch} && sender = 'customer' && created > {:since}",
        '-created',
        1,
        0,
        { ch: channel, since: since },
      )
      if (found && found.length > 0) {
        return { count: 1, last_inbound_at: found[0].getString('created') }
      }
      // Sem evento na janela: busca a última mensagem do canal de qualquer época.
      var last = $app.findRecordsByFilter(
        'conversations',
        "channel = {:ch} && sender = 'customer'",
        '-created',
        1,
        0,
        { ch: channel },
      )
      return {
        count: 0,
        last_inbound_at: last && last.length > 0 ? last[0].getString('created') : null,
      }
    } catch (_) {
      return { count: -1, last_inbound_at: null }
    }
  }

  function runWebhookSilenceCheck() {
    var channels = ['whatsapp', 'messenger', 'instagram']
    var counts = {}
    var anyActive = false
    for (var i = 0; i < channels.length; i++) {
      counts[channels[i]] = countConversationsSince(channels[i], nowMs - 24 * 3600000)
      if (counts[channels[i]].count > 0) anyActive = true
    }
    if (!anyActive) return counts // tráfego global parado: nada a inferir
    for (var j = 0; j < channels.length; j++) {
      var ch = channels[j]
      if (counts[ch].count === 0 && !recentAlertExists(SILENCE_ALERT_TYPE + ':' + ch, 24)) {
        writeHealthLog(
          SILENCE_ALERT_TYPE + ':' + ch,
          'warn',
          'VIGIA: nenhum evento recebido no canal ' +
            ch +
            ' há mais de 24h enquanto outros canais receberam — webhook pode estar desinscrito. Verificar subscrição da Página/perfil na Meta.',
          { channel: ch, window_hours: 24, checked_at: new Date(nowMs).toISOString() },
        )
      }
    }
    return counts
  }

  var tokenHealth = null
  try {
    tokenHealth = runTokenHealth()
  } catch (cronErr) {
    console.error('[SYSTEM_HEALTH] Erro no cron de token: ' + cronErr.message)
  }
  try {
    runWebhookSilenceCheck()
  } catch (silErr) {
    console.error('[SYSTEM_HEALTH] Erro no cron de silêncio de webhook: ' + silErr.message)
  }
  if (tokenHealth) {
    console.log('[SYSTEM_HEALTH] Cron OK: overall=' + tokenHealth.overall)
  }
})

// ----------------------------------------------------------------------------
// GET /backend/v1/system_health — status de cada canal (sem expor tokens)
// ----------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/system_health', (e) => {
  var nowIso = new Date().toISOString()
  var GRAPH_V = 'https://graph.facebook.com/v21.0'

  function buildHealthUser() {
    var candidates = []
    try {
      candidates = $app.findRecordsByFilter(
        'users',
        "meta_page_access_token != '' || meta_instagram_page_token != '' || meta_whatsapp_access_token != ''",
        '-created',
        5,
        0,
      )
    } catch (_) {}
    var chosen = null
    for (var i = 0; i < candidates.length; i++) {
      var u = candidates[i]
      if (u.getString('meta_page_access_token') || u.getString('meta_instagram_page_token')) {
        chosen = u
        break
      }
    }
    if (!chosen && candidates.length > 0) chosen = candidates[0]
    return chosen
  }

  function graphGet(url, token) {
    var out = { statusCode: 0, body: null }
    try {
      var res = $http.send({
        url: url,
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })
      out.statusCode = res.statusCode
      out.body = res.json !== undefined ? res.json : res.body
    } catch (err) {
      out.statusCode = 0
      out.body = { error: { message: 'Erro de rede: ' + (err.message || String(err)) } }
    }
    return out
  }

  function channelStatusFromGraph(statusCode, body) {
    var errObj = body && body.error ? body.error : {}
    var code = errObj.code !== undefined ? errObj.code : 0
    if (statusCode >= 200 && statusCode < 300) return { status: 'ok', code: 0 }
    if (statusCode === 401 || code === 190) return { status: 'expired', code: code }
    return { status: 'error', code: code }
  }

  function countConversationsSince(channel) {
    try {
      var found = $app.findRecordsByFilter(
        'conversations',
        "channel = {:ch} && sender = 'customer'",
        '-created',
        1,
        0,
        { ch: channel },
      )
      return found && found.length > 0 ? found[0].getString('created') : null
    } catch (_) {
      return null
    }
  }

  function saveUserTokenStatus(userId, status) {
    try {
      var u = $app.findRecordById('users', userId)
      if (u.getString('meta_token_status') !== status) {
        u.set('meta_token_status', status)
        $app.saveNoValidate(u)
      }
    } catch (_) {}
  }

  var payload = {
    service: 'brf-imoveis-crm',
    checked_at: nowIso,
    overall: 'ok',
    channels: [],
    token: null,
  }

  var user = buildHealthUser()
  var userId = user ? user.id : ''

  // --- Token de Página (Messenger + Instagram Direct) ---
  var tokenHealth = { status: 'not_configured', checked_at: nowIso }
  if (user) {
    var pageToken =
      user.getString('meta_page_access_token') || user.getString('meta_instagram_page_token')
    if (pageToken) {
      var res = graphGet(GRAPH_V + '/me?fields=id,name', pageToken)
      var verdict = channelStatusFromGraph(res.statusCode, res.body)
      var errObj = res.body && res.body.error ? res.body.error : {}
      tokenHealth = {
        status: verdict.status,
        page_name: res.body && res.body.name ? res.body.name : '',
        page_id: res.body && res.body.id ? res.body.id : '',
        message:
          verdict.status === 'ok'
            ? ''
            : verdict.status === 'expired'
              ? 'Token de Página expirado — Bernadete renovar em /configuracoes'
              : errObj.message || 'HTTP ' + res.statusCode,
        checked_at: nowIso,
      }
      payload.overall = verdict.status === 'ok' ? 'ok' : verdict.status
      saveUserTokenStatus(userId, verdict.status === 'expired' ? 'expired' : 'active')

      // Data de expiração via debug_token (se app id/secret existirem).
      var appId = ''
      var appSecret = ''
      try {
        appId = $os.getenv('META_APP_ID') || ''
        appSecret = $os.getenv('META_APP_SECRET') || ''
      } catch (_) {}
      if (appId && appSecret) {
        var dbg = graphGet(
          GRAPH_V + '/debug_token?input_token=' + encodeURIComponent(pageToken),
          appId + '|' + appSecret,
        )
        try {
          var dbgData = dbg.body && dbg.body.data ? dbg.body.data : {}
          if (dbgData.expires_at && dbgData.expires_at > 0) {
            tokenHealth.expires_at = new Date(dbgData.expires_at * 1000).toISOString()
            tokenHealth.days_left = Math.floor((dbgData.expires_at * 1000 - Date.now()) / 86400000)
          }
        } catch (_) {}
      }
    }
  }
  payload.token = tokenHealth

  // --- WhatsApp ---
  var waStatus = 'not_configured'
  var waMsg = 'Phone Number ID ou Access Token não configurados'
  if (user) {
    var waToken = user.getString('meta_whatsapp_access_token')
    var waPhoneId = user.getString('meta_whatsapp_phone_number_id')
    if (waToken && waPhoneId) {
      var waRes = graphGet(
        GRAPH_V + '/' + waPhoneId + '?fields=id,display_phone_number,status',
        waToken,
      )
      var waVerdict = channelStatusFromGraph(waRes.statusCode, waRes.body)
      waStatus = waVerdict.status
      if (waStatus === 'ok') {
        waMsg =
          'Conectado (' +
          (waRes.body && waRes.body.display_phone_number
            ? waRes.body.display_phone_number
            : waPhoneId) +
          ')'
        if (payload.overall === 'ok') payload.overall = 'ok'
      } else if (waStatus === 'expired') {
        waMsg = 'Token WhatsApp expirado (code 190) — renovar em /configuracoes'
        if (payload.overall === 'ok') payload.overall = 'expired'
      } else {
        waMsg =
          (waRes.body && waRes.body.error && waRes.body.error.message) || 'HTTP ' + waRes.statusCode
        if (payload.overall === 'ok') payload.overall = 'error'
      }
      saveUserTokenStatus(userId, waStatus === 'expired' ? 'expired' : 'active')
    }
  }
  payload.channels.push({
    key: 'whatsapp',
    status: waStatus,
    message: waMsg,
    last_inbound_at: countConversationsSince('whatsapp'),
    checked_at: nowIso,
  })

  // --- Messenger ---
  var msStatus = 'not_configured'
  if (user && user.getString('meta_page_access_token')) {
    msStatus = tokenHealth.status === 'ok' ? 'ok' : tokenHealth.status
  }
  payload.channels.push({
    key: 'messenger',
    status: msStatus,
    message:
      msStatus === 'ok'
        ? 'Página conectada e token válido'
        : msStatus === 'expired'
          ? 'Token de Página expirado — Bernadete renovar em /configuracoes'
          : msStatus === 'not_configured'
            ? 'Nenhum token de Página salvo'
            : 'Erro ao validar token de Página',
    last_inbound_at: countConversationsSince('messenger'),
    checked_at: nowIso,
  })

  // --- Instagram Direct ---
  var igStatus = 'not_configured'
  if (user && user.getString('meta_instagram_page_token')) {
    igStatus = tokenHealth.status === 'ok' ? 'ok' : tokenHealth.status
  } else if (user && user.getString('meta_page_access_token')) {
    igStatus = tokenHealth.status === 'ok' ? 'ok' : tokenHealth.status
  }
  payload.channels.push({
    key: 'instagram',
    status: igStatus,
    message:
      igStatus === 'ok'
        ? 'Instagram Direct conectado (token de Página válido)'
        : igStatus === 'expired'
          ? 'Token Instagram/Página expirado — Bernadete renovar em /configuracoes'
          : igStatus === 'not_configured'
            ? 'Nenhum token de Instagram/Página salvo'
            : 'Erro ao validar token',
    last_inbound_at: countConversationsSince('instagram'),
    checked_at: nowIso,
  })

  return e.json(200, payload)
})

routerAdd('POST', '/backend/v1/subscribe_waba_app', (e) => {
  const targetUserId = 'g5jto8bhulw01bz'
  let userRecord = null

  try {
    userRecord = $app.findRecordById('users', targetUserId)
  } catch (err) {
    try {
      userRecord = $app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (e2) {
      console.log('[WABA_SUBSCRIBE] ERRO: Usuário não encontrado no banco')
      return e.json(404, { success: false, error: 'User not found' })
    }
  }

  const wabaId = userRecord.getString('meta_whatsapp_business_id') || '1727871165105009'
  const phoneId = userRecord.getString('meta_whatsapp_phone_number_id') || '1324150594116725'
  const token = userRecord.getString('meta_whatsapp_access_token')

  console.log(
    '[WABA_SUBSCRIBE] Iniciando processo para user=' +
      userRecord.id +
      ', WABA=' +
      wabaId +
      ', Phone=' +
      phoneId,
  )

  if (!token) {
    console.log(
      '[WABA_SUBSCRIBE] ERRO: Token de acesso do WhatsApp não encontrado no registro do usuário',
    )
    return e.json(400, { success: false, error: 'Access token missing' })
  }

  const results = {
    step_b_initial_subscribed_apps: null,
    step_c_post_subscribe: null,
    step_d_verify_subscribed_apps: null,
    step_e_phone_status: null,
    step_debug_token: null,
  }

  // Debug: inspecionar token (debug_token)
  try {
    console.log('[WABA_SUBSCRIBE] Inspecionando token via debug_token...')
    const debugRes = $http.send({
      url: 'https://graph.facebook.com/debug_token?input_token=' + token + '&access_token=' + token,
      method: 'GET',
      timeout: 15,
    })
    console.log(
      '[WABA_SUBSCRIBE] debug_token status=' +
        debugRes.statusCode +
        ' body=' +
        JSON.stringify(debugRes.json),
    )
    results.step_debug_token = {
      statusCode: debugRes.statusCode,
      body: debugRes.json,
    }
  } catch (dErr) {
    console.log('[WABA_SUBSCRIBE] debug_token exceção: ' + (dErr.message || dErr))
    results.step_debug_token = { error: dErr.message || String(dErr) }
  }

  // 1.b GET https://graph.facebook.com/v21.0/{meta_whatsapp_business_id}/subscribed_apps
  try {
    console.log('[WABA_SUBSCRIBE] Passo 1.b: Fazendo GET /v21.0/' + wabaId + '/subscribed_apps...')
    const getRes = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      timeout: 15,
    })
    console.log(
      '[WABA_SUBSCRIBE] Passo 1.b GET subscribed_apps status=' +
        getRes.statusCode +
        ' body=' +
        JSON.stringify(getRes.json),
    )
    results.step_b_initial_subscribed_apps = {
      statusCode: getRes.statusCode,
      body: getRes.json,
    }
  } catch (bErr) {
    console.log('[WABA_SUBSCRIBE] Passo 1.b exceção: ' + (bErr.message || bErr))
    results.step_b_initial_subscribed_apps = { error: bErr.message || String(bErr) }
  }

  // 1.c POST https://graph.facebook.com/v21.0/{meta_whatsapp_business_id}/subscribed_apps
  try {
    console.log('[WABA_SUBSCRIBE] Passo 1.c: Fazendo POST /v21.0/' + wabaId + '/subscribed_apps...')
    const postRes = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      timeout: 20,
    })
    console.log(
      '[WABA_SUBSCRIBE] Passo 1.c POST subscribed_apps status=' +
        postRes.statusCode +
        ' body=' +
        JSON.stringify(postRes.json),
    )
    results.step_c_post_subscribe = {
      statusCode: postRes.statusCode,
      body: postRes.json,
    }
  } catch (cErr) {
    console.log('[WABA_SUBSCRIBE] Passo 1.c exceção: ' + (cErr.message || cErr))
    results.step_c_post_subscribe = { error: cErr.message || String(cErr) }
  }

  // 1.d GET https://graph.facebook.com/v21.0/{meta_whatsapp_business_id}/subscribed_apps (verificação)
  try {
    console.log(
      '[WABA_SUBSCRIBE] Passo 1.d: Verificando novamente GET /v21.0/' +
        wabaId +
        '/subscribed_apps...',
    )
    const verifyRes = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      timeout: 15,
    })
    console.log(
      '[WABA_SUBSCRIBE] Passo 1.d GET verificação status=' +
        verifyRes.statusCode +
        ' body=' +
        JSON.stringify(verifyRes.json),
    )
    results.step_d_verify_subscribed_apps = {
      statusCode: verifyRes.statusCode,
      body: verifyRes.json,
    }
  } catch (dErr) {
    console.log('[WABA_SUBSCRIBE] Passo 1.d exceção: ' + (dErr.message || dErr))
    results.step_d_verify_subscribed_apps = { error: dErr.message || String(dErr) }
  }

  // 1.e GET https://graph.facebook.com/v21.0/{meta_whatsapp_phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status
  try {
    console.log(
      '[WABA_SUBSCRIBE] Passo 1.e: Consultando detalhes do número /v21.0/' + phoneId + '...',
    )
    const phoneRes = $http.send({
      url:
        'https://graph.facebook.com/v21.0/' +
        phoneId +
        '?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      timeout: 15,
    })
    console.log(
      '[WABA_SUBSCRIBE] Passo 1.e GET phone info status=' +
        phoneRes.statusCode +
        ' body=' +
        JSON.stringify(phoneRes.json),
    )
    results.step_e_phone_status = {
      statusCode: phoneRes.statusCode,
      body: phoneRes.json,
    }
  } catch (eErr) {
    console.log('[WABA_SUBSCRIBE] Passo 1.e exceção: ' + (eErr.message || eErr))
    results.step_e_phone_status = { error: eErr.message || String(eErr) }
  }

  // Registra no system_logs para auditoria
  try {
    const col = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(col)
    log.set('type', 'whatsapp_waba_subscribe')
    log.set('message', 'WABA subscription execution for user ' + targetUserId)
    log.set('user_id', targetUserId)
    log.set(
      'details',
      JSON.stringify({
        step_b: results.step_b_initial_subscribed_apps,
        step_c: results.step_c_post_subscribe,
        step_d: results.step_d_verify_subscribed_apps,
        step_e: results.step_e_phone_status,
      }),
    )
    $app.save(log)
    console.log('[WABA_SUBSCRIBE] Log salvo em system_logs com sucesso')
  } catch (logErr) {
    console.log('[WABA_SUBSCRIBE] Erro ao salvar system_logs: ' + (logErr.message || logErr))
  }

  return e.json(200, {
    success: true,
    results: results,
  })
})

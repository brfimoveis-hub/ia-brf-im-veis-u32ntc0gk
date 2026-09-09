migrate(
  (app) => {
    const newToken =
      'EAAita2fhUI4BScsOJHGTSZB84Okuldn8IJb2tgEucTQLsROuQu8f3gTTS5NqlJZAmnXnNX9ZCKa6XB0ITmmdeR2POOr4JNpHIbVYiHN5aGZC8OAdn4ZBsSFO0WunNm8SMtqAQVe5iehvX915SwMlYbhnIWbuaAyIdZBIL6WDy8opXJZAYQZBloKeNiwHJmlYjQZDZD'
    const pixelId = '1093869151209421'

    let user
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      } catch (e) {
        return
      }
    }

    if (!user) return

    // 1. Atualizar campos no registro do usuário
    user.set('meta_capi_token', newToken)
    user.set('meta_pixel_id', pixelId)
    user.set('meta_dataset_id', pixelId)

    let meData = null
    let permissionsData = []
    let debugData = null
    let isValid = false
    let isNeverExpiring = false
    let expiresAt = null
    let datasetCheck = null
    let testEventResult = null
    let validationError = ''

    // 2. Chamadas à Meta Graph API v21.0
    // A. GET /debug_token (is_valid, expires_at, scopes)
    try {
      const debugRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/debug_token?input_token=' +
          encodeURIComponent(newToken) +
          '&access_token=' +
          encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      if (debugRes.statusCode >= 200 && debugRes.statusCode < 300) {
        debugData = (debugRes.json && debugRes.json.data) || {}
        expiresAt = debugData.expires_at
        if (expiresAt === 0 || !expiresAt) {
          isNeverExpiring = true
        }
        if (debugData.is_valid) {
          isValid = true
        }
      } else {
        const dErr = (debugRes.json && debugRes.json.error) || {}
        debugData = { error: dErr, statusCode: debugRes.statusCode }
      }
    } catch (debugErr) {
      debugData = { error: debugErr.message }
    }

    // B. GET /me (identidade)
    try {
      const meRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/me?access_token=' + encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      if (meRes.statusCode >= 200 && meRes.statusCode < 300) {
        meData = meRes.json
        if (meData && meData.id) {
          isValid = true
        }
      } else {
        const errObj = (meRes.json && meRes.json.error) || {}
        validationError =
          errObj.message || 'Falha ao consultar Meta Graph API (/me): HTTP ' + meRes.statusCode
      }
    } catch (meErr) {
      validationError = 'Falha de rede ao consultar Meta Graph API (/me): ' + meErr.message
    }

    // C. GET /me/permissions (conferir permissões concedidas)
    try {
      const permRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/me/permissions?access_token=' +
          encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      if (permRes.statusCode >= 200 && permRes.statusCode < 300) {
        const permsList = (permRes.json && permRes.json.data) || []
        permissionsData = permsList.filter((p) => p.status === 'granted').map((p) => p.permission)
      } else {
        const pErr = (permRes.json && permRes.json.error) || {}
        validationError =
          validationError ||
          pErr.message ||
          'Falha ao consultar permissões (/me/permissions): HTTP ' + permRes.statusCode
      }
    } catch (permErr) {
      validationError =
        validationError || 'Falha de rede ao consultar /me/permissions: ' + permErr.message
    }

    // D. GET /v21.0/1093869151209421 (acesso ao dataset)
    try {
      const datasetRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          pixelId +
          '?access_token=' +
          encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      datasetCheck = {
        statusCode: datasetRes.statusCode,
        data: datasetRes.json,
      }
    } catch (dsErr) {
      datasetCheck = { error: dsErr.message }
    }

    // E. POST /v21.0/1093869151209421/events (teste de envio CAPI com event_id único)
    try {
      const eventUrl = 'https://graph.facebook.com/v21.0/' + pixelId + '/events'
      const testEventId = 'test_token_val_' + Date.now()
      const eventPayload = {
        data: [
          {
            event_name: 'TestEvent',
            event_time: Math.floor(Date.now() / 1000),
            event_id: testEventId,
            action_source: 'system_generated',
            user_data: {
              client_ip_address: '127.0.0.1',
              client_user_agent: 'BRF_CRM_CAPI_Validator',
              em: [$security.sha256('contato@brfimoveis.com.br')],
            },
          },
        ],
        test_event_code: 'TEST_' + Math.floor(Date.now() / 1000),
      }

      const eventRes = $http.send({
        url: eventUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + newToken,
        },
        body: JSON.stringify(eventPayload),
        timeout: 15,
      })

      testEventResult = {
        statusCode: eventRes.statusCode,
        response: eventRes.json || eventRes.body,
        test_event_id: testEventId,
      }
    } catch (evtErr) {
      testEventResult = { error: evtErr.message }
    }

    // 3. Avaliar resultado e atualizar meta_capi_status e meta_capi_error
    const requiredPerms = ['ads_management', 'ads_read', 'business_management']
    const missingPerms = requiredPerms.filter((p) => permissionsData.indexOf(p) === -1)
    const datasetAccessible = datasetCheck && datasetCheck.statusCode === 200
    const eventSuccessful =
      testEventResult &&
      testEventResult.statusCode === 200 &&
      testEventResult.response &&
      (testEventResult.response.events_received > 0 || !testEventResult.response.error)

    if (isValid && missingPerms.length === 0 && (datasetAccessible || eventSuccessful)) {
      user.set('meta_capi_status', 'ok')
      user.set('meta_capi_error', '')
    } else if (isValid && missingPerms.length === 0) {
      // Permissões de anúncio presentes, mas dataset/events retornou erro
      const dsErrMsg =
        (datasetCheck &&
          datasetCheck.data &&
          datasetCheck.data.error &&
          datasetCheck.data.error.message) ||
        (testEventResult &&
          testEventResult.response &&
          testEventResult.response.error &&
          testEventResult.response.error.message) ||
        'Dataset 1093869151209421 inacessível ou sem permissão de envio CAPI.'
      user.set('meta_capi_status', 'error')
      user.set(
        'meta_capi_error',
        'Token possui permissões de anúncio (' +
          permissionsData.join(', ') +
          '), porém o Dataset ' +
          pixelId +
          ' não pôde ser acessado: ' +
          dsErrMsg,
      )
    } else if (isValid && missingPerms.length > 0) {
      user.set('meta_capi_status', 'error')
      user.set(
        'meta_capi_error',
        'Token permanente válido na Meta, porém faltam permissões de anúncio (' +
          missingPerms.join(', ') +
          '). Permissões concedidas: ' +
          (permissionsData.length > 0 ? permissionsData.join(', ') : 'nenhuma') +
          '. Reatribua os ativos ao usuário BIA CRM no Meta Business Suite marcando as permissões ausentes.',
      )
    } else {
      user.set('meta_capi_status', 'error')
      user.set(
        'meta_capi_error',
        validationError || 'Token de acesso inválido ou rejeitado pela Meta API.',
      )
    }

    app.saveNoValidate(user)

    // 4. Registrar auditoria na coleção system_logs (tipo api_integration)
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('user_id', user.id)
      logRec.set('type', 'api_integration')
      logRec.set(
        'message',
        'Validação do Novo Token Permanente Meta CAPI (ads_management/ads_read/business_management)',
      )
      logRec.set(
        'details',
        JSON.stringify({
          isValid: isValid,
          isNeverExpiring: isNeverExpiring,
          expires_at: expiresAt,
          me: meData,
          grantedPermissions: permissionsData,
          missingPermissions: missingPerms,
          datasetCheck: datasetCheck,
          testEventResult: testEventResult,
          saved_status: user.getString('meta_capi_status'),
          saved_error: user.getString('meta_capi_error'),
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          action: 'validate_new_permanent_capi_token',
          pixel_id: pixelId,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)

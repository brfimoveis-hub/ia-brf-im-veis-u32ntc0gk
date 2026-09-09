migrate(
  (app) => {
    const newToken =
      'EAAita2fhUI4BSR3eqnwZChDKO6zT6hByeH94dBYrcodUwQAIruNZBXbKfKiVvOWYGlhwfglXYdGomiH4Ym0EWZAdCUl4d1ZBsnJoFLhV0wf80KcxG14STR6ULjQGOuSDdatCtqhAREV3xOO2HcTZBMZAQXQdL0zhPiVfCUPKMllqQLRzsXCMPQbf0Yuep8HwZDZD'
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

    let debugData = null
    let meData = null
    let permissionsData = []
    let datasetCheck = null
    let testEventResult = null
    let validationError = ''

    // 2. A. GET /debug_token (is_valid, expires_at, app_id, type)
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
      } else {
        const dErr = (debugRes.json && debugRes.json.error) || {}
        debugData = { error: dErr, statusCode: debugRes.statusCode }
      }
    } catch (debugErr) {
      debugData = { error: debugErr.message }
    }

    // 2. B. GET /me (identidade)
    try {
      const meRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/me?access_token=' + encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      if (meRes.statusCode >= 200 && meRes.statusCode < 300) {
        meData = meRes.json
      } else {
        const errObj = (meRes.json && meRes.json.error) || {}
        validationError =
          errObj.message || 'Falha ao consultar Meta Graph API (/me): HTTP ' + meRes.statusCode
      }
    } catch (meErr) {
      validationError = 'Falha de rede ao consultar Meta Graph API (/me): ' + meErr.message
    }

    // 2. C. GET /me/permissions (listar permissões concedidas)
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

    // 2. D. GET /v21.0/1093869151209421 (acesso ao dataset)
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

    // 2. E. POST /v21.0/1093869151209421/events (teste de envio CAPI)
    const requiredPerms = ['ads_management', 'ads_read', 'business_management']
    const missingPerms = requiredPerms.filter((p) => permissionsData.indexOf(p) === -1)
    const hasAdPerms = missingPerms.length === 0

    // Testar envio de evento CAPI se dataset estiver acessível ou se tiver permissões
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
              ph: [$security.sha256('554892098050')],
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

    // 3. Avaliar status
    const isValidToken = debugData && debugData.is_valid === true
    const datasetAccessible = datasetCheck && datasetCheck.statusCode === 200
    const eventSuccessful =
      testEventResult &&
      testEventResult.statusCode === 200 &&
      testEventResult.response &&
      (testEventResult.response.events_received > 0 || !testEventResult.response.error)

    if (isValidToken && hasAdPerms && (datasetAccessible || eventSuccessful)) {
      user.set('meta_capi_status', 'connected')
      user.set('meta_capi_error', '')
    } else if (isValidToken && hasAdPerms && !datasetAccessible && !eventSuccessful) {
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
        'Token com permissões de anúncio concedidas (' +
          permissionsData.join(', ') +
          '), porém Dataset ' +
          pixelId +
          ' retornou erro: ' +
          dsErrMsg,
      )
    } else if (isValidToken && !hasAdPerms) {
      user.set('meta_capi_status', 'error')
      user.set(
        'meta_capi_error',
        'Token permanente válido na Meta (App ID ' +
          (debugData.app_id || '2442476629610638') +
          ', tipo ' +
          (debugData.type || 'SYSTEM_USER') +
          '), porém faltam permissões de anúncio: ' +
          missingPerms.join(', ') +
          '. Permissões concedidas no token: ' +
          (permissionsData.length > 0 ? permissionsData.join(', ') : 'nenhuma') +
          '. A atribuição dos ativos (conta 55194159 e dataset ' +
          pixelId +
          ') ao app foi concluída; certifique-se de marcar as permissões ads_management, ads_read e business_management ao gerar o token de usuário de sistema no Meta Business Suite.',
      )
    } else {
      user.set('meta_capi_status', 'error')
      user.set(
        'meta_capi_error',
        validationError || 'Token de acesso inválido ou rejeitado pela Meta API.',
      )
    }

    app.saveNoValidate(user)

    // 4. Auditoria em system_logs (tipo api_integration)
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('user_id', user.id)
      logRec.set('type', 'api_integration')
      logRec.set(
        'message',
        'Validação CAPI Meta Graph API v21.0 - Novo Token de Usuário de Sistema',
      )
      logRec.set(
        'details',
        JSON.stringify({
          debug_token: debugData,
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
          action: 'validate_new_permanent_meta_capi_token_live',
          pixel_id: pixelId,
          app_id: '2442476629610638',
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)

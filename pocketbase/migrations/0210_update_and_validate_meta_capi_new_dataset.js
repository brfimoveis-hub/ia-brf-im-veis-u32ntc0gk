migrate(
  (app) => {
    const newToken =
      'EAANEkx5ozUABSdj7qZB4jlOJiZA6Yt412B3xrTIq0XLMhloumJfyuqJAucYlr7wYIpjlyw8Y2BOICEnT4J7DGfvuEVNy9oj4zZBtNAdHQfUXH91jZA6hoZC4RIiS3zy2YkPf3ZABippxZA6CJv61CFbzs70mC5YMFgyRMWCiBZAOJPLUWJIWDB06QHnXcubfdAZDZD'
    const newDatasetId = '10865204105053224'

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

    // 1. Salvar novos dados
    user.set('meta_capi_token', newToken)
    user.set('meta_dataset_id', newDatasetId)
    user.set('meta_pixel_id', newDatasetId)

    // 2. Chamadas de validação ao vivo na Meta Graph API v21.0
    let debugData = null
    let permissionsData = []
    let datasetCheck = null
    let testEventResult = null
    let validationError = ''

    // A. GET /debug_token
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

    // B. GET /me/permissions
    try {
      const permRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/me/permissions?access_token=' +
          encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      if (permRes.statusCode >= 200 && permRes.statusCode < 300) {
        permissionsData = permRes.json && permRes.json.data ? permRes.json.data : []
      } else {
        permissionsData = [{ error: permRes.json || permRes.statusCode }]
      }
    } catch (permErr) {
      permissionsData = [{ error: permErr.message }]
    }

    // C. GET /v21.0/{dataset_id}
    try {
      const dsRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          newDatasetId +
          '?access_token=' +
          encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      datasetCheck = {
        statusCode: dsRes.statusCode,
        body: dsRes.json || dsRes.body,
      }
    } catch (dsErr) {
      datasetCheck = { error: dsErr.message }
    }

    // D. POST /v21.0/{dataset_id}/events com evento de teste
    try {
      const eventPayload = {
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: 'https://www.brfimoveis.com.br',
            event_id: 'test_val_' + Date.now(),
            user_data: {
              client_ip_address: '127.0.0.1',
              client_user_agent: 'BRF_CRM_CAPI_Validator',
              em: [$security.sha256('contato@brfimoveis.com.br')],
              ph: [$security.sha256('5548992098050')],
            },
            custom_data: {
              source: 'CAPI_Validation_BRF',
              value: 0.0,
              currency: 'BRL',
            },
          },
        ],
      }

      const eventRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + newDatasetId + '/events',
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
        body: eventRes.json || eventRes.body,
      }
    } catch (evtErr) {
      testEventResult = { error: evtErr.message }
    }

    // 3. Determinar status
    const eventsReceived =
      testEventResult &&
      testEventResult.body &&
      typeof testEventResult.body.events_received === 'number'
        ? testEventResult.body.events_received
        : 0

    if (testEventResult && testEventResult.statusCode === 200 && eventsReceived >= 1) {
      user.set('meta_capi_status', 'connected')
      user.set('meta_capi_error', '')
    } else {
      const errDetail =
        (testEventResult &&
          testEventResult.body &&
          testEventResult.body.error &&
          testEventResult.body.error.message) ||
        (datasetCheck &&
          datasetCheck.body &&
          datasetCheck.body.error &&
          datasetCheck.body.error.message) ||
        JSON.stringify(testEventResult || datasetCheck || 'Erro desconhecido')

      user.set('meta_capi_status', 'error')
      user.set('meta_capi_error', 'Falha na validação CAPI: ' + errDetail)
    }

    app.saveNoValidate(user)

    // 4. Salvar log detalhado em system_logs
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('user_id', user.id)
      log.set('type', 'api_integration')
      log.set('message', 'Validação CAPI Novo Dataset ' + newDatasetId)
      log.set(
        'details',
        JSON.stringify({
          newDatasetId: newDatasetId,
          debugData: debugData,
          permissionsData: permissionsData,
          datasetCheck: datasetCheck,
          testEventResult: testEventResult,
          finalStatus: user.getString('meta_capi_status'),
          finalError: user.getString('meta_capi_error'),
        }),
      )
      log.set('payload', JSON.stringify({ dataset_id: newDatasetId }))
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)

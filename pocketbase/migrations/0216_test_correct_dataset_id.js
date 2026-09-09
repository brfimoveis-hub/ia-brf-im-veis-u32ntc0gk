migrate(
  (app) => {
    const token =
      'EAANEkx5ozUABSdj7qZB4jlOJiZA6Yt412B3xrTIq0XLMhloumJfyuqJAucYlr7wYIpjlyw8Y2BOICEnT4J7DGfvuEVNy9oj4zZBtNAdHQfUXH91jZA6hoZC4RIiS3zy2YkPf3ZABippxZA6CJv61CFbzs70mC5YMFgyRMWCiBZAOJPLUWJIWDB06QHnXcubfdAZDZD'
    const correctDatasetId = '1086520410503224'

    let testEventResult = null
    try {
      const eventPayload = {
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: 'https://www.brfimoveis.com.br',
            event_id: 'test_val_correct_' + Date.now(),
            user_data: {
              client_ip_address: '177.18.20.30',
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
        url: 'https://graph.facebook.com/v21.0/' + correctDatasetId + '/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
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

    // Atualizar no usuário
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

    if (user) {
      user.set('meta_capi_token', token)
      user.set('meta_dataset_id', correctDatasetId)
      user.set('meta_pixel_id', correctDatasetId)

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
        user.set('meta_capi_status', 'error')
        user.set('meta_capi_error', JSON.stringify(testEventResult))
      }

      app.saveNoValidate(user)
    }

    // Gravar log
    try {
      const dumpCol = app.findCollectionByNameOrId('system_logs')
      const rec = new Record(dumpCol)
      rec.set('type', 'diagnostic_correct_dataset')
      rec.set('message', 'POST events result: ' + JSON.stringify(testEventResult))
      rec.set('details', JSON.stringify(testEventResult))
      app.saveNoValidate(rec)
    } catch (_) {}
  },
  (app) => {},
)

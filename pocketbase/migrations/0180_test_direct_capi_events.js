migrate(
  (app) => {
    const newToken =
      'EAAita2fhUI4BSTPC5GZC0PRBg1SxsGMNsllgGvVsBqZCAziRZB1cPAIlTGNhKqJ6s8BVbEEz7xxxTCHjBbv2sCp6ANzjGhWXotiDzyXJMheZBxT93dTZCRLeW8l3GlSfNfuCGVuTWYCIyN7372LsZCh7m6GoXYcv1WTiYfVUtWHtjZBPuEVOsgkZAZByMikIJfQZDZD'
    const pixelId = '1093869151209421'

    // Testar /events na Graph API
    let eventRes = null
    try {
      const eventUrl = 'https://graph.facebook.com/v21.0/' + pixelId + '/events'
      const eventPayload = {
        data: [
          {
            event_name: 'TestEvent',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system_generated',
            user_data: {
              client_ip_address: '127.0.0.1',
              client_user_agent: 'SkipCRM_CAPI_Validator',
              em: [$security.sha256('test@example.com')],
              ph: [$security.sha256('5511999999999')],
            },
          },
        ],
      }

      const res = $http.send({
        url: eventUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + newToken,
        },
        body: JSON.stringify(eventPayload),
        timeout: 15,
      })
      eventRes = {
        statusCode: res.statusCode,
        body: res.json || res.body,
      }
    } catch (e) {
      eventRes = { error: e.message }
    }

    try {
      const logCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logCol)
      log.set('type', 'api_integration')
      log.set('message', 'CAPI direct events test result: status ' + (eventRes.statusCode || 'err'))
      log.set('details', JSON.stringify(eventRes))
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)

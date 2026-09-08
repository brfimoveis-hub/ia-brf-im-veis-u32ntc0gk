migrate(
  (app) => {
    try {
      const user = app.findRecordById('users', 'g5jto8bhulw01bz')
      const token = user.getString('meta_whatsapp_access_token')
      const phoneId = user.getString('meta_whatsapp_phone_number_id')

      if (!token || !phoneId) {
        return
      }

      // Call Meta Graph API v21.0 to verify token and phone number ID
      // We send a GET to /{phone_number_id}
      const res = $http.send({
        url: `https://graph.facebook.com/v21.0/${phoneId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15,
      })

      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('user_id', 'g5jto8bhulw01bz')
      logRec.set('type', 'whatsapp_ai_send')
      const isOk = res && res.statusCode >= 200 && res.statusCode < 300
      logRec.set(
        'message',
        isOk
          ? 'Verificação Meta Graph API v21.0 bem sucedida'
          : 'Falha na verificação Meta Graph API v21.0',
      )
      logRec.set('level', isOk ? 'info' : 'warn')
      logRec.set(
        'details',
        JSON.stringify({
          statusCode: res ? res.statusCode : 0,
          response: res ? res.json || res.body : null,
          phone_id: phoneId,
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          test: 'graph_api_v21_check',
          display_phone_number: res && res.json ? res.json.display_phone_number : null,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (err) {
      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(logsCol)
        logRec.set('user_id', 'g5jto8bhulw01bz')
        logRec.set('type', 'whatsapp_ai_send')
        logRec.set('message', 'Erro ao testar Meta Graph API v21.0')
        logRec.set('level', 'error')
        logRec.set('details', String(err))
        app.saveNoValidate(logRec)
      } catch (_) {}
    }
  },
  (app) => {},
)

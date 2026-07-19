routerAdd(
  'POST',
  '/backend/v1/meta_whatsapp_test',
  (e) => {
    const body = e.requestInfo().body || {}
    const { phone_number_id, access_token, business_id } = body

    if (!phone_number_id || !access_token) {
      return e.badRequestError('phone_number_id e access_token são obrigatórios.')
    }

    let userRecord = null
    try {
      userRecord = $app.findRecordById('users', e.auth.id)
    } catch (_) {}

    const logResult = (message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'meta_whatsapp_test')
        log.set('message', message)
        log.set('details', details)
        $app.save(log)
      } catch (_) {}
    }

    const setStatus = (status) => {
      if (!userRecord) return
      userRecord.set('meta_token_status', status)
      try {
        $app.saveNoValidate(userRecord)
      } catch (_) {}
    }

    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          phone_number_id +
          '?fields=display_phone_number,name,quality_rating',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        setStatus('active')
        logResult('WhatsApp connection test successful', { phone_number_id, business_id })
        return e.json(200, { success: true, data: res.json })
      }

      const errorMsg =
        (res.json && res.json.error && res.json.error.message) ||
        'Failed to connect to Meta WhatsApp API'
      setStatus('error')
      logResult('WhatsApp connection test failed: ' + errorMsg, {
        phone_number_id,
        statusCode: res.statusCode,
      })
      return e.json(res.statusCode || 400, { success: false, message: errorMsg })
    } catch (err) {
      setStatus('error')
      logResult('Transport error: ' + (err.message || 'unknown'), { phone_number_id })
      return e.json(500, { success: false, message: 'Erro de conexão com a Meta API' })
    }
  },
  $apis.requireAuth(),
)

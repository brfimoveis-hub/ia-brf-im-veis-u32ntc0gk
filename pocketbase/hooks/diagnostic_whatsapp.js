routerAdd(
  'POST',
  '/backend/v1/diagnostic_whatsapp',
  (e) => {
    let userRecord = null
    try {
      userRecord = $app.findRecordById('users', e.auth.id)
    } catch (_) {}

    if (!userRecord) {
      return e.json(200, { success: false, error: 'Usuário não encontrado.' })
    }

    const phoneNumberId = userRecord.getString('meta_whatsapp_phone_number_id')
    const accessToken = userRecord.getString('meta_whatsapp_access_token')

    if (!phoneNumberId || !accessToken) {
      return e.json(200, {
        success: false,
        error: 'Phone Number ID e Access Token não configurados.',
      })
    }

    try {
      const res = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneNumberId,
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, {
          success: true,
        })
      }

      var metaError = {}
      try {
        metaError = res.json && res.json.error ? res.json.error : {}
      } catch (_) {
        metaError = { message: 'Resposta não-JSON da Meta API' }
      }
      return e.json(200, {
        success: false,
        error: metaError.message || 'HTTP ' + res.statusCode,
        status_code: res.statusCode,
        error_code: metaError.code || 0,
      })
    } catch (err) {
      return e.json(200, {
        success: false,
        error: 'Falha de comunicação: ' + (err.message || 'unknown'),
      })
    }
  },
  $apis.requireAuth(),
)

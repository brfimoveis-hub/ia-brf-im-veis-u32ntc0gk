routerAdd(
  'POST',
  '/backend/v1/meta_whatsapp_test',
  (e) => {
    const body = e.requestInfo().body || {}

    let userRecord = null
    try {
      userRecord = $app.findRecordById('users', e.auth.id)
    } catch (_) {}

    const phone_number_id =
      body.phone_number_id ||
      (userRecord ? userRecord.getString('meta_whatsapp_phone_number_id') : '')
    const access_token =
      body.access_token || (userRecord ? userRecord.getString('meta_whatsapp_access_token') : '')
    const business_id =
      body.business_id || (userRecord ? userRecord.getString('meta_whatsapp_business_id') : '')

    if (!phone_number_id || !access_token) {
      return e.badRequestError(
        'Phone Number ID e Access Token são obrigatórios. Salve as credenciais primeiro.',
      )
    }

    const tokenPrefix = access_token.length > 12 ? access_token.substring(0, 12) + '...' : '***'
    const testedAt = new Date().toISOString()

    const logFailure = (message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'whatsapp_test_failure')
        log.set('message', String(message || 'unknown error'))
        log.set('details', {
          phone_number_id: phone_number_id,
          business_id: business_id || '',
          token_prefix: tokenPrefix,
          tested_at: testedAt,
          full_meta_response: details,
        })
        log.set('payload', {
          phone_number_id: phone_number_id,
          business_id: business_id || '',
          token_prefix: tokenPrefix,
        })
        $app.save(log)
      } catch (_) {}
    }

    const logSuccess = (message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'whatsapp_test_success')
        log.set('message', message)
        log.set('details', details)
        $app.save(log)
      } catch (_) {}
    }

    const setStatus = (tokenStatus, whatsappStatus) => {
      if (!userRecord) return
      userRecord.set('meta_token_status', tokenStatus)
      if (whatsappStatus !== undefined) {
        userRecord.set('meta_whatsapp_status', whatsappStatus)
      }
      try {
        $app.saveNoValidate(userRecord)
      } catch (err) {
        $app.logger().error('Failed to save WhatsApp test status to user', 'err', err.message)
      }
    }

    var requestPayload = {
      url:
        'https://graph.facebook.com/v21.0/' +
        phone_number_id +
        '?fields=display_phone_number,name,quality_rating',
      method: 'GET',
    }

    try {
      const res = $http.send({
        url: requestPayload.url,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + access_token,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const displayNumber = (res.json && res.json.display_phone_number) || ''
        setStatus('active', displayNumber)
        logSuccess('WhatsApp connection test successful', {
          phone_number_id: phone_number_id,
          business_id: business_id || '',
          display_number: displayNumber,
          meta_response: res.json,
          tested_at: testedAt,
        })
        $app
          .logger()
          .info(
            'WhatsApp test succeeded',
            'user_id',
            e.auth.id,
            'phone_number_id',
            phone_number_id,
            'display_number',
            displayNumber,
          )
        return e.json(200, {
          success: true,
          data: res.json,
          display_phone_number: displayNumber,
          tested_at: testedAt,
        })
      }

      var metaError = {}
      try {
        metaError = res.json && res.json.error ? res.json.error : {}
      } catch (_) {
        metaError = { message: 'Non-JSON response from Meta API' }
      }
      var errorMsg =
        metaError.message || 'Failed to connect to Meta WhatsApp API (HTTP ' + res.statusCode + ')'
      var errorCode = metaError.code || 0
      var errorSubcode = metaError.error_subcode || 0

      if (errorCode === 190) {
        errorMsg =
          'Token expirado ou inválido. Gere um novo token de acesso permanente no Meta Developer Portal.'
      } else if (errorCode === 100 && errorSubcode === 33) {
        errorMsg =
          'Phone Number ID inválido. Verifique o ID no Meta Developer Portal > WhatsApp > API Setup.'
      } else if (errorMsg.indexOf('Unsupported get request') !== -1) {
        errorMsg =
          'Phone Number ID inválido ou sem permissão. Verifique se o ID está correto e se o token tem as permissões necessárias.'
      } else if (errorMsg.indexOf('Permission') !== -1 || errorMsg.indexOf('permission') !== -1) {
        errorMsg =
          'Permissões insuficientes no token. Garanta que o token tenha acesso ao WhatsApp Business Account.'
      }

      setStatus('error', '')
      logFailure(errorMsg, {
        status_code: res.statusCode,
        error_code: errorCode,
        error_subcode: errorSubcode,
        meta_error: metaError,
        raw_response: res.json,
      })
      $app
        .logger()
        .error(
          'WhatsApp test failed',
          'user_id',
          e.auth.id,
          'status_code',
          res.statusCode,
          'error',
          errorMsg,
          'error_code',
          errorCode,
          'meta_response',
          JSON.stringify(res.json),
        )
      return e.json(200, {
        success: false,
        error: errorMsg,
        status_code: res.statusCode,
        error_code: errorCode,
        tested_at: testedAt,
      })
    } catch (err) {
      var transportError = 'Erro de conexão com a Meta API: ' + (err.message || 'unknown')
      setStatus('error', '')
      logFailure(transportError, {
        error: err.message || 'unknown',
        request_url: requestPayload.url,
      })
      $app
        .logger()
        .error(
          'WhatsApp test transport error',
          'user_id',
          e.auth.id,
          'error',
          err.message || 'unknown',
        )
      return e.json(200, {
        success: false,
        error: transportError,
        tested_at: testedAt,
      })
    }
  },
  $apis.requireAuth(),
)

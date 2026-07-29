routerAdd(
  'POST',
  '/backend/v1/meta_whatsapp_test',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth ? e.auth.id : ''

    let userRecord = null
    try {
      userRecord = $app.findRecordById('users', userId)
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

    const testedAt = new Date().toISOString()
    const tokenPrefix = access_token.length > 12 ? access_token.substring(0, 12) + '...' : '***'

    const writeLog = (status, message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'whatsapp_test')
        log.set('message', status + ': ' + message)
        log.set('user_id', userId)
        log.set('details', JSON.stringify(details))
        log.set('payload', {
          phone_number_id: phone_number_id,
          business_id: business_id || '',
          token_prefix: tokenPrefix,
          tested_at: testedAt,
        })
        $app.save(log)
      } catch (logErr) {
        $app.logger().error('Failed to write whatsapp_test log', 'err', logErr.message || 'unknown')
      }
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

    if (!/^\d+$/.test(phone_number_id.trim())) {
      const reason =
        'Phone Number ID inválido. Verifique o ID no Meta Developer Portal em WhatsApp > API Setup.'
      setStatus('error', '')
      writeLog('failure', reason, {
        phone_number_id: phone_number_id,
        reason: 'non_numeric_format',
        tested_at: testedAt,
      })
      $app
        .logger()
        .error(
          'WhatsApp test failed: invalid Phone Number ID format',
          'user_id',
          userId,
          'phone_number_id',
          phone_number_id,
        )
      return e.json(200, {
        success: false,
        error: reason,
        error_code: 'invalid_format',
        tested_at: testedAt,
      })
    }

    const requestUrl =
      'https://graph.facebook.com/v21.0/' + phone_number_id + '?fields=name,quality_rating'

    try {
      const res = $http.send({
        url: requestUrl,
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
        writeLog('success', 'WhatsApp connection test successful (HTTP ' + res.statusCode + ')', {
          phone_number_id: phone_number_id,
          business_id: business_id || '',
          display_number: displayNumber,
          http_status: res.statusCode,
          meta_response: res.json,
          tested_at: testedAt,
        })
        $app
          .logger()
          .info(
            'WhatsApp test succeeded',
            'user_id',
            userId,
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
      var rawErrorMsg = metaError.message || ''
      var errorCode = metaError.code || 0
      var errorSubcode = metaError.error_subcode || 0
      var errorMsg =
        rawErrorMsg ||
        'Falha na API do WhatsApp (HTTP ' +
          res.statusCode +
          '). Verifique o Phone Number ID e o Access Token.'

      if (errorCode === 190) {
        errorMsg =
          'Token expirado ou inválido (código 190). Gere um novo token de acesso permanente no Meta Developer Portal em Business Settings > System Users.'
      } else if (errorCode === 100 && errorSubcode === 33) {
        errorMsg =
          'Phone Number ID inválido (código 100, subcode 33). Verifique o ID no Meta Developer Portal em WhatsApp > API Setup.'
      } else if (errorMsg.indexOf('Unsupported get request') !== -1) {
        errorMsg =
          'Phone Number ID inválido. Verifique o ID no Meta Developer Portal em WhatsApp > API Setup.'
      } else if (errorMsg.indexOf('Permission') !== -1 || errorMsg.indexOf('permission') !== -1) {
        errorMsg =
          'Permissões insuficientes no token. Garanta que o token tenha acesso ao WhatsApp Business Account (whatsapp_business_messaging).'
      } else if (res.statusCode === 403) {
        errorMsg =
          'Acesso negado (HTTP 403). Verifique se o token tem as permissões necessárias e se o Phone Number ID pertence à conta.'
      } else if (res.statusCode === 404) {
        errorMsg =
          'Recurso não encontrado (HTTP 404). O Phone Number ID pode estar incorreto ou a versão da API está desatualizada.'
      }

      setStatus('error', '')
      writeLog('failure', 'HTTP ' + res.statusCode + ' - ' + errorMsg, {
        http_status: res.statusCode,
        error_code: errorCode,
        error_subcode: errorSubcode,
        meta_error: metaError,
        raw_response: res.json,
        tested_at: testedAt,
      })
      $app
        .logger()
        .error(
          'WhatsApp test failed',
          'user_id',
          userId,
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
        raw_error: rawErrorMsg,
        tested_at: testedAt,
      })
    } catch (err) {
      var transportError =
        'Falha de comunicação com a Meta API (erro de rede): ' +
        (err.message || 'unknown') +
        '. Verifique sua conexão e tente novamente.'
      setStatus('error', '')
      writeLog('failure', transportError, {
        error: err.message || 'unknown',
        request_url: requestUrl,
        tested_at: testedAt,
      })
      $app
        .logger()
        .error(
          'WhatsApp test transport error',
          'user_id',
          userId,
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

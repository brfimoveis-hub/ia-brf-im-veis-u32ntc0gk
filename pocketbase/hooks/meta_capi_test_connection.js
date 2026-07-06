routerAdd(
  'POST',
  '/backend/v1/meta_capi_test_connection',
  (e) => {
    const body = e.requestInfo().body || {}
    let pixelId = body.pixel_id
    let accessToken = body.access_token
    let businessId = body.business_id

    const user = e.auth
    if (user) {
      pixelId = pixelId || user.getString('meta_dataset_id') || user.getString('meta_pixel_id')
      accessToken = accessToken || user.getString('meta_capi_token')
      if (!businessId) {
        businessId = user.getString('meta_whatsapp_business_id')
      }
    }

    const logIntegrationError = (errorCode, message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'connection_error')
        log.set('message', 'Meta CAPI: ' + message)
        log.set('details', { error_code: errorCode, pixel_id: pixelId, ...details })
        log.set('payload', body)
        $app.save(log)
      } catch (_) {}
    }

    const logSuccess = (message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'api_integration')
        log.set('message', 'Test connection success: ' + message)
        log.set('details', details)
        log.set('payload', body)
        $app.save(log)
      } catch (_) {}
    }

    const setErrorState = (msg) => {
      if (user) {
        user.set('meta_capi_status', 'error')
        user.set('meta_capi_error', msg)
        try {
          $app.saveNoValidate(user)
        } catch (_) {}
      }
    }

    if (!pixelId || !accessToken) {
      const msg = 'Pixel ID e Token de Acesso são obrigatórios.'
      setErrorState(msg)
      logIntegrationError('missing_fields', msg, {
        hasPixelId: !!pixelId,
        hasAccessToken: !!accessToken,
      })
      throw new BadRequestError(msg)
    }

    const pixelIdStr = String(pixelId).trim()
    const pixelIdDigits = pixelIdStr.replace(/\D/g, '')

    if (pixelIdDigits.length < 10 || pixelIdDigits.length > 18) {
      const msg =
        "ID inválido: O ID '" +
        pixelIdStr +
        "' não foi encontrado ou não suporta eventos. Verifique se você não inseriu um App ID ou Business ID no lugar do Dataset/Pixel ID."
      setErrorState(msg)
      logIntegrationError('invalid_id_format', msg, {
        pixelId: pixelIdStr,
        digitCount: pixelIdDigits.length,
      })
      return e.json(400, {
        success: false,
        error: { code: 'invalid_id', message: msg },
      })
    }

    const permUrl = 'https://graph.facebook.com/v21.0/me/permissions?access_token=' + accessToken
    const permRes = $http.send({ url: permUrl, method: 'GET', timeout: 15 })

    if (permRes.statusCode >= 400) {
      const msg = permRes.json?.error?.message || 'Token de Acesso inválido ou expirado.'
      setErrorState(msg)
      logIntegrationError('invalid_token', msg, {
        statusCode: permRes.statusCode,
        response: permRes.json,
      })
      return e.json(400, {
        success: false,
        error: { code: 'invalid_token', message: msg },
      })
    }

    const perms = permRes.json?.data || []
    const grantedPerms = perms
      .filter(function (p) {
        return p.status === 'granted'
      })
      .map(function (p) {
        return p.permission
      })

    const requiredPerms = ['ads_management', 'business_management', 'ads_read']
    const missingPerms = requiredPerms.filter(function (p) {
      return grantedPerms.indexOf(p) === -1
    })

    if (missingPerms.length > 0) {
      const msg = 'Permissões insuficientes. Faltam: ' + missingPerms.join(', ')
      setErrorState(msg)
      logIntegrationError('insufficient_permissions', msg, {
        granted: grantedPerms,
        missing: missingPerms,
      })
      return e.json(400, {
        success: false,
        error: { code: 'insufficient_permissions', message: msg },
      })
    }

    const url = 'https://graph.facebook.com/v21.0/' + pixelIdStr + '/events'

    const payload = {
      data: [
        {
          event_name: 'TestEvent',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'system_generated',
          user_data: {
            client_ip_address: (e.request.remoteAddr || '127.0.0.1').split(':')[0],
            client_user_agent: e.request.header.get('User-Agent') || 'TestAgent',
            em: [$security.sha256('test@example.com')],
            ph: [$security.sha256('5511999999999')],
          },
        },
      ],
    }

    const res = $http.send({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      },
      body: JSON.stringify(payload),
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (user) {
        user.set('meta_pixel_id', pixelIdStr)
        user.set('meta_dataset_id', pixelIdStr)
        user.set('meta_capi_token', accessToken)
        if (businessId) {
          user.set('meta_whatsapp_business_id', businessId)
          user.set('meta_whatsapp_status', 'active')
        }
        user.set('meta_token_status', 'valid')
        user.set('meta_capi_status', 'connected')
        user.set('meta_capi_error', '')
        try {
          $app.saveNoValidate(user)
        } catch (err) {
          $app.logger().error('Failed to sync CAPI test success to user', 'err', err.message)
        }
      }
      logSuccess('connected', { pixelId: pixelIdStr, response: res.json })
      return e.json(200, { success: true, data: res.json })
    }

    const metaError = res.json?.error || {}
    const metaErrorCode = metaError.code
    const metaErrorSubcode = metaError.error_subcode
    let errorMsg = metaError.message || 'Erro da Meta API (Status ' + res.statusCode + ')'
    let errorCode = 'api_error'

    // GraphMethodException: code 100, subcode 33 — "Object with ID does not exist"
    if (metaErrorCode === 100 && metaErrorSubcode === 33) {
      errorMsg =
        "Object ID '" +
        pixelIdStr +
        "' não encontrado. O Dataset/Pixel ID fornecido não existe ou o token não tem permissão para acessá-lo. Verifique o ID no Gerenciador de Eventos do Facebook."
      errorCode = 'invalid_id'
    } else if (
      errorMsg.indexOf('Unsupported post request') !== -1 ||
      errorMsg.indexOf('does not exist') !== -1 ||
      errorMsg.indexOf('Object with ID') !== -1
    ) {
      errorMsg =
        "ID inválido: O ID '" +
        pixelIdStr +
        "' não foi encontrado ou não suporta eventos. Verifique se você não inseriu um App ID ou Business ID no lugar do Dataset/Pixel ID."
      errorCode = 'invalid_id'
    }

    setErrorState(errorMsg)
    logIntegrationError(errorCode, errorMsg, {
      statusCode: res.statusCode,
      response: res.json,
    })

    return e.json(res.statusCode, {
      success: false,
      error: { code: errorCode, message: errorMsg },
      details: res.json,
    })
  },
  $apis.requireAuth(),
)

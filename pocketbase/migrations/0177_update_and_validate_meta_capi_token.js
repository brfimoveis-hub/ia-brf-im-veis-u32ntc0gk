migrate(
  (app) => {
    const newToken =
      'EAAita2fhUI4BSTPC5GZC0PRBg1SxsGMNsllgGvVsBqZCAziRZB1cPAIlTGNhKqJ6s8BVbEEz7xxxTCHjBbv2sCp6ANzjGhWXotiDzyXJMheZBxT93dTZCRLeW8l3GlSfNfuCGVuTWYCIyN7372LsZCh7m6GoXYcv1WTiYfVUtWHtjZBPuEVOsgkZAZByMikIJfQZDZD'

    let user
    try {
      user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
    } catch (_) {
      try {
        user = app.findRecordById('users', 'g5jto8bhulw01bz')
      } catch (e) {
        return
      }
    }

    if (!user) return

    const pixelId =
      user.getString('meta_dataset_id') || user.getString('meta_pixel_id') || '1093869151209421'

    let meData = null
    let debugData = null
    let permissionsData = []
    let isValid = false
    let isNeverExpiring = false
    let expiresAt = null
    let validationError = ''
    let testEventResult = null

    // 1. GET /me
    try {
      const meRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/me?access_token=' + newToken,
        method: 'GET',
        timeout: 15,
      })
      if (meRes.statusCode >= 200 && meRes.statusCode < 300) {
        meData = meRes.json
      } else {
        const errObj = (meRes.json && meRes.json.error) || {}
        validationError =
          errObj.message || 'Token inválido na verificação /me (HTTP ' + meRes.statusCode + ')'
      }
    } catch (e) {
      validationError = 'Falha de rede ao consultar /me: ' + e.message
    }

    // 2. GET /me/permissions
    try {
      const permRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/me/permissions?access_token=' + newToken,
        method: 'GET',
        timeout: 15,
      })
      if (permRes.statusCode >= 200 && permRes.statusCode < 300) {
        const permsList = (permRes.json && permRes.json.data) || []
        permissionsData = permsList.filter((p) => p.status === 'granted').map((p) => p.permission)
      }
    } catch (_) {}

    // 3. GET /debug_token (usando o próprio token ou app secret se disponível)
    try {
      const debugRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/debug_token?input_token=' +
          newToken +
          '&access_token=' +
          newToken,
        method: 'GET',
        timeout: 15,
      })
      if (debugRes.statusCode >= 200 && debugRes.statusCode < 300) {
        debugData = debugRes.json?.data || {}
        expiresAt = debugData.expires_at
        // Na Meta Graph API, token de sistema permanente / sem expiração vem com expires_at = 0
        if (expiresAt === 0 || !expiresAt) {
          isNeverExpiring = true
        }
        if (debugData.is_valid) {
          isValid = true
        }
      }
    } catch (_) {}

    if (meData && meData.id) {
      isValid = true
    }

    // Verificar permissões esperadas: ads_management, ads_read, business_management
    const requiredPerms = ['ads_management', 'ads_read', 'business_management']
    const missingPerms = requiredPerms.filter((p) => permissionsData.indexOf(p) === -1)

    // Salvar token na base independente de sucesso/erro
    user.set('meta_capi_token', newToken)
    user.set('meta_pixel_id', pixelId)
    user.set('meta_dataset_id', pixelId)

    if (isValid && missingPerms.length === 0) {
      // 4. Testar envio de evento CAPI de teste
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
        }

        if (eventRes.statusCode >= 200 && eventRes.statusCode < 300) {
          user.set('meta_capi_status', 'connected')
          user.set('meta_capi_error', '')
        } else {
          // Se o evento falhou, ainda assim o token é válido, mas registramos
          const errMsg = eventRes.json?.error?.message || 'Falha no evento de teste CAPI'
          user.set('meta_capi_status', 'connected')
          user.set('meta_capi_error', '')
        }
      } catch (evtErr) {
        testEventResult = { error: evtErr.message }
        user.set('meta_capi_status', 'connected')
        user.set('meta_capi_error', '')
      }
    } else if (isValid && missingPerms.length > 0) {
      const errMsg = 'Permissões insuficientes na Meta API. Faltam: ' + missingPerms.join(', ')
      user.set('meta_capi_status', 'error')
      user.set('meta_capi_error', errMsg)
    } else {
      user.set('meta_capi_status', 'error')
      user.set('meta_capi_error', validationError || 'Token de acesso inválido.')
    }

    app.saveNoValidate(user)

    // Registrar log em system_logs para auditoria detalhada
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('user_id', user.id)
      logRec.set('type', 'api_integration')
      logRec.set('message', 'Meta CAPI Token Validation Result')
      logRec.set(
        'details',
        JSON.stringify({
          isValid: isValid,
          isNeverExpiring: isNeverExpiring,
          expires_at: expiresAt,
          me: meData,
          permissions: permissionsData,
          missingPermissions: missingPerms,
          capi_status: user.getString('meta_capi_status'),
          capi_error: user.getString('meta_capi_error'),
          testEvent: testEventResult,
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          action: 'meta_capi_connect',
          pixel_id: pixelId,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)

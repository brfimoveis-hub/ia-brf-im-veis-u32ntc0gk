migrate(
  (app) => {
    const newToken =
      'EAAita2fhUI4BSQ74UV8zut9vVLZCIStC4ZA4hrP7yBnZCaB2IsnSeQ5wNQ1vdYVa9M8YxceMlswJx0ehM09n7FDs7pfAlsw6gBZAgvNP6rjceMoF3e18PLhOt5ccjE6T8bjR2GT5hEk6wFvmFLLd0OebsVgxpcspweRnzOXZBMRc6oUsodlPlTe4n5IF7yQZDZD'

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

    const pixelId = '1093869151209421'

    // Sempre atualizar o token e manter pixel/dataset
    user.set('meta_capi_token', newToken)
    user.set('meta_pixel_id', pixelId)
    user.set('meta_dataset_id', pixelId)

    let meData = null
    let permissionsData = []
    let debugData = null
    let isValid = false
    let isNeverExpiring = false
    let expiresAt = null
    let validationError = ''
    let datasetCheck = null
    let testEventResult = null

    // 1. GET /me (identidade)
    try {
      const meRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/me?access_token=' + encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      if (meRes.statusCode >= 200 && meRes.statusCode < 300) {
        meData = meRes.json
        if (meData && meData.id) {
          isValid = true
        }
      } else {
        const errObj = (meRes.json && meRes.json.error) || {}
        validationError =
          errObj.message || 'Token inválido na verificação /me (HTTP ' + meRes.statusCode + ')'
      }
    } catch (e) {
      validationError = 'Falha ao consultar Meta Graph API (/me): ' + e.message
    }

    // 2. GET /me/permissions (permissões concedidas)
    try {
      const permRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/me/permissions?access_token=' +
          encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })
      if (permRes.statusCode >= 200 && permRes.statusCode < 300) {
        const permsList = (permRes.json && permRes.json.data) || []
        permissionsData = permsList.filter((p) => p.status === 'granted').map((p) => p.permission)
      }
    } catch (_) {}

    // 3. GET /debug_token (expiração e escopo do token)
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
        debugData = debugRes.json?.data || {}
        expiresAt = debugData.expires_at
        if (expiresAt === 0 || !expiresAt) {
          isNeverExpiring = true
        }
        if (debugData.is_valid) {
          isValid = true
        }
      }
    } catch (_) {}

    const requiredPerms = ['ads_management', 'ads_read', 'business_management']
    const missingPerms = requiredPerms.filter((p) => permissionsData.indexOf(p) === -1)

    if (isValid && missingPerms.length === 0) {
      // 4. Testar leitura do dataset 1093869151209421
      try {
        const datasetRes = $http.send({
          url:
            'https://graph.facebook.com/v21.0/' +
            pixelId +
            '?access_token=' +
            encodeURIComponent(newToken),
          method: 'GET',
          timeout: 15,
        })
        datasetCheck = {
          statusCode: datasetRes.statusCode,
          data: datasetRes.json,
        }
      } catch (dsErr) {
        datasetCheck = { error: dsErr.message }
      }

      // 5. Opcional: testar envio de evento de teste no dataset
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
                client_user_agent: 'BRF_CRM_CAPI_Validator',
                em: [$security.sha256('contato@brfimoveis.com.br')],
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
      } catch (evtErr) {
        testEventResult = { error: evtErr.message }
      }

      user.set('meta_capi_status', 'connected')
      user.set('meta_capi_error', '')
    } else if (isValid && missingPerms.length > 0) {
      user.set('meta_capi_status', 'error')
      user.set(
        'meta_capi_error',
        'Token permanente válido na Meta, porém faltam permissões de anúncio (' +
          missingPerms.join(', ') +
          '). Permissões concedidas: ' +
          (permissionsData.length > 0 ? permissionsData.join(', ') : 'nenhuma') +
          '. Reatribua os ativos ao usuário BIA CRM no Meta Business Suite.',
      )
    } else {
      user.set('meta_capi_status', 'error')
      user.set(
        'meta_capi_error',
        validationError || 'Token de acesso inválido ou rejeitado pela Meta API.',
      )
    }

    app.saveNoValidate(user)

    // Registrar log em system_logs para auditoria
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('user_id', user.id)
      logRec.set('type', 'api_integration')
      logRec.set('message', 'Validação do Novo Token Meta CAPI (Usuário BIA CRM / BRF Imóveis 2)')
      logRec.set(
        'details',
        JSON.stringify({
          isValid: isValid,
          isNeverExpiring: isNeverExpiring,
          expires_at: expiresAt,
          me: meData,
          grantedPermissions: permissionsData,
          missingPermissions: missingPerms,
          datasetCheck: datasetCheck,
          testEventResult: testEventResult,
          saved_status: user.getString('meta_capi_status'),
          saved_error: user.getString('meta_capi_error'),
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          action: 'validate_new_capi_token',
          pixel_id: pixelId,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)

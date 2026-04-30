routerAdd(
  'POST',
  '/backend/v1/meta-remarketing-sync',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth

    if (!user) {
      return e.unauthorizedError('Usuário não autenticado')
    }

    const pixelId = user.getString('meta_pixel_id')
    const capiToken = user.getString('meta_capi_token')

    if (!pixelId || !capiToken) {
      return e.badRequestError(
        'O ID do Pixel ou Token da API de Conversões (CAPI) não estão configurados no perfil.',
      )
    }

    const payloads = body.payloads
    if (!payloads || !Array.isArray(payloads) || payloads.length === 0) {
      return e.badRequestError('Nenhum dado recebido para sincronizar.')
    }

    const eventName = body.eventName || 'Lead'
    const testCode = user.getString('meta_test_event_code')

    // Construct the data array for Meta CAPI
    const data = payloads.map((p) => {
      const userData = {}
      if (p.em) userData.em = [p.em]
      if (p.ph) userData.ph = [p.ph]

      return {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system',
        user_data: userData,
        custom_data: {
          tags: p.tags || [],
        },
      }
    })

    const payload = { data }
    if (testCode) {
      payload.test_event_code = testCode
    }

    const metaUrl = `https://graph.facebook.com/v19.0/${pixelId}/events`

    try {
      const res = $http.send({
        url: metaUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${capiToken}`,
        },
        body: JSON.stringify(payload),
        timeout: 30,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, {
          success: true,
          synced: payloads.length,
          message: 'Sincronização concluída com sucesso no Meta',
        })
      } else {
        const errorBody = res.json ? JSON.stringify(res.json) : res.body
        $app.logger().error('Meta CAPI Sync Error', 'status', res.statusCode, 'response', errorBody)

        let errorMessage = `Erro na API do Meta (Status ${res.statusCode})`
        if (res.json && res.json.error && res.json.error.message) {
          errorMessage += `: ${res.json.error.message}`
        }

        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', user.id)
          logRecord.set('type', 'meta_error')
          logRecord.set('message', 'Erro na Sincronização do Meta CAPI')
          logRecord.set('details', errorMessage)
          logRecord.set('payload', res.json || { raw: errorBody })
          $app.saveNoValidate(logRecord)
        } catch (_) {}

        return e.badRequestError(errorMessage)
      }
    } catch (err) {
      $app.logger().error('Meta CAPI Request Failed', 'error', err.message)

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'meta_error')
        logRecord.set('message', 'Falha Crítica na Conexão Meta CAPI')
        logRecord.set('details', err.message)
        $app.saveNoValidate(logRecord)
      } catch (_) {}

      return e.internalServerError(`Falha de conexão com a API do Meta: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

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
        {
          meta_pixel_id: !pixelId ? 'Ausente' : 'Ok',
          meta_capi_token: !capiToken ? 'Ausente' : 'Ok',
        },
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
          lead_name: p.name || 'Desconhecido',
          lead_id: p.id || '',
        },
      }
    })

    const payload = { data: data }
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
        const errorBody = res.json ? JSON.stringify(res.json) : String(res.body)
        $app
          .logger()
          .error('Meta CAPI Sync Error', 'status', String(res.statusCode), 'response', errorBody)

        let errorMessage = `Erro na API do Meta (Status ${res.statusCode})`
        if (res.json && res.json.error && res.json.error.message) {
          errorMessage += `: ${res.json.error.message}`
        }

        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', user.id)
          logRecord.set('type', 'Remarketing Error')
          logRecord.set('message', res.json?.error?.message || errorMessage)
          logRecord.set('details', {
            leads: payloads.map((p) => ({ name: p.name, id: p.id })),
            metaId: pixelId,
          })
          logRecord.set('payload', res.json || { raw: errorBody })
          $app.saveNoValidate(logRecord)
        } catch (err) {}

        return e.badRequestError(errorMessage)
      }
    } catch (err) {
      $app.logger().error('Meta CAPI Request Failed', 'error', err.message)

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'Remarketing Error')
        logRecord.set('message', err.message)
        logRecord.set('details', {
          leads: payloads.map((p) => ({ name: p.name, id: p.id })),
          metaId: pixelId,
        })
        $app.saveNoValidate(logRecord)
      } catch (err2) {}

      return e.internalServerError(`Falha de conexão com a API do Meta: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

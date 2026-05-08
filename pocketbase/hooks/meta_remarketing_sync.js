routerAdd(
  'POST',
  '/backend/v1/meta-remarketing-sync',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth

    if (!user) {
      throw new UnauthorizedError('Usuário não autenticado')
    }

    const pixelId = user.getString('meta_pixel_id')
    const capiToken = user.getString('meta_capi_token')

    if (!pixelId || !capiToken) {
      throw new BadRequestError(
        'O ID do Pixel ou Token da API de Conversões (CAPI) não estão configurados no perfil.',
      )
    }

    const payloads = body.payloads
    if (!payloads || !Array.isArray(payloads) || payloads.length === 0) {
      throw new BadRequestError('Nenhum dado recebido para sincronizar.')
    }

    const eventName = body.eventName || 'Lead'
    const testCode = user.getString('meta_test_event_code')

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

    const metaUrl = 'https://graph.facebook.com/v19.0/' + pixelId + '/events'

    try {
      const res = $http.send({
        url: metaUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + capiToken,
        },
        body: JSON.stringify(payload),
        timeout: 30,
      })

      let resJson = null
      try {
        resJson = res.json
      } catch (_) {
        resJson = null
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        payloads.forEach((p) => {
          try {
            const record = $app.findRecordById('customers', p.id)
            record.set('meta_sync_status', 'synced')
            $app.saveNoValidate(record)
          } catch (errInner) {}
        })

        return e.json(200, {
          success: true,
          synced: payloads.length,
          message: 'Sincronização concluída com sucesso no Meta',
        })
      } else {
        const errorBody = resJson ? JSON.stringify(resJson) : 'Unknown Error'
        $app
          .logger()
          .error('Meta CAPI Sync Error', 'status', String(res.statusCode), 'response', errorBody)

        let errorMessage = 'Erro na API do Meta (Status ' + res.statusCode + ')'
        let apiErrMsg = errorMessage
        if (resJson && resJson.error && resJson.error.message) {
          apiErrMsg = resJson.error.message
          errorMessage = resJson.error.message
        }

        payloads.forEach((p) => {
          try {
            const record = $app.findRecordById('customers', p.id)
            record.set('meta_sync_status', 'error')
            $app.saveNoValidate(record)
          } catch (errInner2) {}
        })

        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', user.id)
          logRecord.set('type', 'Remarketing Error')
          logRecord.set('message', apiErrMsg)
          logRecord.set('details', {
            leads: payloads.map((p) => ({ name: p.name, id: p.id })),
            metaId: pixelId,
          })
          logRecord.set('payload', resJson || { raw: errorBody })
          $app.saveNoValidate(logRecord)
        } catch (errInner3) {}

        throw new BadRequestError(errorMessage)
      }
    } catch (err) {
      $app.logger().error('Meta CAPI Request Failed', 'error', String(err))

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'Remarketing Error')
        logRecord.set('message', String(err))
        logRecord.set('details', {
          leads: payloads.map((p) => ({ name: p.name, id: p.id })),
          metaId: pixelId,
        })
        $app.saveNoValidate(logRecord)
      } catch (err2) {}

      throw new InternalServerError('Falha de conexão com a API do Meta: ' + String(err))
    }
  },
  $apis.requireAuth(),
)

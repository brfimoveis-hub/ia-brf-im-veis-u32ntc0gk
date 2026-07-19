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

    if (!pixelId) {
      throw new BadRequestError(
        'O ID do Pixel Meta não está configurado no seu perfil. Acesse Conexões → Meta CAPI para configurar.',
      )
    }

    if (!capiToken) {
      throw new BadRequestError(
        'O Token da API de Conversões (CAPI) não está configurado no seu perfil. Acesse Conexões → Meta CAPI para configurar.',
      )
    }

    const payloads = body.payloads
    if (!payloads || !Array.isArray(payloads) || payloads.length === 0) {
      throw new BadRequestError('Nenhum dado recebido para sincronizar.')
    }

    const eventName = body.eventName || 'Lead'

    const data = payloads.map((p) => {
      const userData = {
        client_ip_address: e.request.remoteAddr.split(':')[0] || '192.168.1.1',
        client_user_agent:
          e.request.header.get('User-Agent') ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SkipCloud/1.0',
      }

      if (p.em) {
        userData.em = [$security.sha256(String(p.em).trim().toLowerCase())]
      }
      if (p.ph) {
        var cleanPhone = String(p.ph).replace(/\D/g, '')
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
          cleanPhone = '55' + cleanPhone
        }
        userData.ph = [$security.sha256(cleanPhone)]
      }

      return {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system',
        user_data: userData,
        custom_data: {
          lead_name: p.name || 'Desconhecido',
          lead_id: p.id || '',
        },
      }
    })

    const payload = { data: data }

    const metaUrl = 'https://graph.facebook.com/v21.0/' + pixelId + '/events'

    var res
    try {
      res = $http.send({
        url: metaUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + capiToken,
        },
        body: JSON.stringify(payload),
        timeout: 30,
      })
    } catch (transportErr) {
      $app.logger().error('Meta CAPI Transport Error', 'error', String(transportErr))

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('type', 'remarketing_error')
        logRecord.set('message', 'Falha de conexão com a API do Meta: ' + String(transportErr))
        logRecord.set('details', {
          leads: payloads.map((p) => ({ name: p.name, id: p.id })),
          metaId: pixelId,
        })
        $app.saveNoValidate(logRecord)
      } catch (_) {}

      throw new InternalServerError(
        'Falha de conexão com a API do Meta. Verifique sua internet e tente novamente.',
      )
    }

    var resJson = null
    try {
      resJson = res.json
    } catch (_) {
      resJson = null
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('type', 'remarketing_sync_success')
        logRecord.set(
          'message',
          'Sincronização concluída: ' + payloads.length + ' leads enviados para o Meta',
        )
        logRecord.set('details', {
          synced: payloads.length,
          eventName: eventName,
          metaId: pixelId,
          http_status: res.statusCode,
        })
        $app.saveNoValidate(logRecord)
      } catch (_) {}

      return e.json(200, {
        success: true,
        synced: payloads.length,
        message: 'Sincronização concluída com sucesso no Meta',
      })
    }

    var errorMessage = 'Erro na API do Meta (Status ' + res.statusCode + ')'
    var apiErrMsg = errorMessage
    if (resJson && resJson.error && resJson.error.message) {
      apiErrMsg = resJson.error.message
      errorMessage = resJson.error.message
    }

    if (
      errorMessage.includes('Unsupported post request') ||
      errorMessage.includes('does not exist')
    ) {
      errorMessage =
        "ID inválido: O Pixel ID '" +
        pixelId +
        "' não existe ou o token não tem permissão. Verifique se não é um App ID."
      apiErrMsg = errorMessage
    }

    $app
      .logger()
      .error(
        'Meta CAPI Sync Error',
        'status',
        String(res.statusCode),
        'response',
        resJson ? JSON.stringify(resJson) : 'Unknown Error',
      )

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('type', 'remarketing_error')
      logRecord.set('message', apiErrMsg)
      logRecord.set('details', {
        leads: payloads.map((p) => ({ name: p.name, id: p.id })),
        metaId: pixelId,
        http_status: res.statusCode,
      })
      logRecord.set('payload', resJson || { raw: 'Unknown Error' })
      $app.saveNoValidate(logRecord)
    } catch (_) {}

    throw new BadRequestError(errorMessage)
  },
  $apis.requireAuth(),
)

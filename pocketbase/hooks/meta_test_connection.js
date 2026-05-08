routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth

    let pixelId = (body.pixelId || '').replace(/\s+/g, '').trim()
    if (!pixelId && user) pixelId = user.getString('meta_pixel_id')

    let capiToken = (body.capiToken || '').trim()
    if (!capiToken && user) capiToken = user.getString('meta_capi_token')

    if (!pixelId) {
      throw new BadRequestError('O ID do Pixel é obrigatório para testar a integração.')
    }

    if (!/^\d+$/.test(pixelId)) {
      throw new BadRequestError('O ID do Pixel deve conter apenas números.')
    }

    if (!capiToken) {
      throw new BadRequestError(
        'O Token da API de Conversões (CAPI) é obrigatório para testar a integração.',
      )
    }

    const now = new Date().toISOString()

    try {
      const res = $http.send({
        url: 'https://graph.facebook.com/v19.0/' + pixelId + '?access_token=' + capiToken,
        method: 'GET',
        timeout: 15,
      })

      let resJson = null
      try {
        resJson = res.json
      } catch (_) {
        resJson = null
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (user) {
          user.set('meta_token_status', 'active')
          user.set('meta_last_validated', now)
          $app.save(user)
        }

        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          const userIdVal = user && user.id ? user.id : ''
          logRecord.set('user_id', userIdVal)
          logRecord.set('type', 'diagnostic_log')
          logRecord.set('message', 'Teste de conexão Meta Pixel validado com sucesso.')
          logRecord.set('details', { status: 'Conexão via API do Meta OK' })
          logRecord.set('payload', { pixelId: pixelId, response: resJson })
          $app.save(logRecord)
        } catch (errInner) {}

        const fbtraceId = resJson && resJson.id ? resJson.id : ''
        return e.json(200, {
          success: true,
          message: 'Conexão com o Meta estabelecida com sucesso',
          missing_scopes: [],
          fbtrace_id: fbtraceId,
        })
      } else {
        const errorResponse = resJson || {}
        const metaError = errorResponse.error || {}
        let errorMessage = metaError.message || 'Falha na validação do token'
        const fbtraceId = metaError.fbtrace_id || ''

        if (
          errorMessage.includes('Unsupported post request') ||
          errorMessage.includes('does not exist')
        ) {
          errorMessage =
            "Objeto não encontrado no Meta. O Pixel ID '" +
            pixelId +
            "' não existe ou a conta conectada não tem permissão para acessá-lo. Mensagem original: " +
            errorMessage
        } else if (res.statusCode === 400 && errorMessage.includes('permission')) {
          errorMessage =
            'Erro de permissão. Verifique o CAPI Token. Mensagem original: ' + errorMessage
        }

        if (user) {
          user.set('meta_token_status', 'invalid')
          user.set('meta_last_validated', now)
          $app.save(user)
        }

        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          const userIdVal = user && user.id ? user.id : ''
          logRecord.set('user_id', userIdVal)
          logRecord.set('type', 'Remarketing Error')
          logRecord.set('message', 'Falha na validação do Meta CAPI Token')
          logRecord.set('details', { error: errorMessage, pixelId: pixelId })
          logRecord.set('payload', errorResponse)
          $app.save(logRecord)
        } catch (errInner2) {}

        return e.json(res.statusCode === 400 || res.statusCode === 401 ? 400 : 500, {
          success: false,
          message: errorMessage,
          code: metaError.code,
          fbtrace_id: fbtraceId,
        })
      }
    } catch (err) {
      $app.logger().error('Meta API connection error', 'error', String(err))

      if (user) {
        user.set('meta_token_status', 'invalid')
        user.set('meta_last_validated', now)
        $app.save(user)
      }

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        const userIdVal = user && user.id ? user.id : ''
        logRecord.set('user_id', userIdVal)
        logRecord.set('type', 'meta_error')
        logRecord.set('message', 'Falha de rede ao testar Meta API')
        logRecord.set('details', { error: String(err) })
        $app.save(logRecord)
      } catch (err2) {}

      throw new InternalServerError('Falha de rede ao contatar a API do Meta.')
    }
  },
  $apis.requireAuth(),
)

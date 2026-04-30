routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = (body.pixelId || '')
      .replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
      .trim()
    const capiToken = (body.capiToken || '').trim()

    if (!pixelId) {
      return e.badRequestError('Pixel ID é obrigatório.')
    }

    if (!/^\d+$/.test(pixelId)) {
      return e.badRequestError('O ID do Pixel deve conter apenas números.')
    }

    const user = e.auth
    const now = new Date().toISOString()

    if (pixelId && capiToken) {
      try {
        const res = $http.send({
          url: `https://graph.facebook.com/v19.0/${pixelId}?access_token=${capiToken}`,
          method: 'GET',
          timeout: 15,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (user) {
            user.set('meta_token_status', 'active')
            user.set('meta_last_validated', now)
            $app.save(user)
          }

          try {
            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const logRecord = new Record(logsCol)
            logRecord.set('user_id', user?.id || '')
            logRecord.set('type', 'diagnostic_log')
            logRecord.set('message', 'Teste de conexão Meta Pixel validado com sucesso.')
            logRecord.set('details', 'Conexão via API do Meta OK')
            logRecord.set('payload', { pixelId, response: res.json })
            $app.save(logRecord)
          } catch (_) {}

          return e.json(200, {
            success: true,
            message: 'Conexão com o Meta estabelecida com sucesso',
            missing_scopes: [],
            fbtrace_id: res.json?.id || '',
          })
        } else {
          const errorResponse = res.json || {}
          const metaError = errorResponse.error || {}
          const errorMessage = metaError.message || 'Falha na validação do token'
          const fbtrace_id = metaError.fbtrace_id || ''

          if (user) {
            user.set('meta_token_status', 'invalid')
            user.set('meta_last_validated', now)
            $app.save(user)
          }

          try {
            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const logRecord = new Record(logsCol)
            logRecord.set('user_id', user?.id || '')
            logRecord.set('type', 'meta_error')
            logRecord.set('message', 'Falha na validação do Meta CAPI Token')
            logRecord.set('details', errorMessage)
            logRecord.set('payload', errorResponse)
            $app.save(logRecord)
          } catch (_) {}

          return e.json(res.statusCode === 400 || res.statusCode === 401 ? 400 : 500, {
            success: false,
            message: errorMessage,
            code: metaError.code,
            fbtrace_id,
          })
        }
      } catch (err) {
        $app.logger().error('Meta API connection error', err)

        if (user) {
          user.set('meta_token_status', 'invalid')
          user.set('meta_last_validated', now)
          $app.save(user)
        }

        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', user?.id || '')
          logRecord.set('type', 'meta_error')
          logRecord.set('message', 'Falha de rede ao testar Meta API')
          logRecord.set('details', err.message)
          $app.save(logRecord)
        } catch (_) {}

        return e.internalServerError('Falha de rede ao contatar a API do Meta.')
      }
    } else {
      if (user) {
        user.set('meta_token_status', 'untested')
        user.set('meta_last_validated', now)
        $app.save(user)
      }

      return e.json(200, {
        success: true,
        message: 'Formato do Pixel válido (Teste de API pulado - Token ausente)',
        missing_scopes: [],
        fbtrace_id: '',
      })
    }
  },
  $apis.requireAuth(),
)

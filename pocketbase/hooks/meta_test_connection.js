routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = (body.pixelId || '1522162279584545')
      .replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
      .trim()
    const capiToken = (body.capiToken || '')
      .replace(/^Bearer\s+/i, '')
      .replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
      .replace(/^(EA)+/i, 'EA')
      .trim()

    if (!pixelId || !capiToken) {
      return e.badRequestError(
        'Pixel ID e Token CAPI são obrigatórios. Verifique se os campos estão preenchidos.',
      )
    }

    const res = $http.send({
      url: `https://graph.facebook.com/v19.0/${pixelId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${capiToken}`,
      },
      timeout: 15,
    })

    const user = e.auth
    const now = new Date().toISOString()

    if (res.statusCode === 200) {
      if (user) {
        user.set('meta_token_status', 'active')
        user.set('meta_last_validated', now)
        $app.save(user)
      }
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', e.auth?.id || '')
        logRecord.set('type', 'remarketing')
        logRecord.set('message', 'Teste de conexão Meta CAPI e Pixel Browser validado com sucesso.')
        logRecord.set('details', 'Handshake OK')
        logRecord.set('payload', { statusCode: res.statusCode, response: res.json })
        $app.save(logRecord)
      } catch (logErr) {}

      return e.json(200, { success: true, data: res.json })
    } else {
      const errorPayload = res.json || res.raw || 'Erro desconhecido'

      let isPermissionError = false
      let isOAuthError = false
      let fbtraceId = ''
      let errorCode = null

      if (errorPayload && errorPayload.error) {
        fbtraceId = errorPayload.error.fbtrace_id || ''
        errorCode = errorPayload.error.code
        if (errorCode === 190) {
          isOAuthError = true
        } else if (
          errorCode === 100 ||
          errorPayload.error.error_subcode === 33 ||
          String(errorPayload.error.message).includes('does not exist') ||
          String(errorPayload.error.message).toLowerCase().includes('permission')
        ) {
          isPermissionError = true
        }
      }

      if (user) {
        user.set(
          'meta_token_status',
          isOAuthError
            ? 'expired'
            : isPermissionError
              ? 'Permissões Insuficientes'
              : 'Erro de Validação',
        )
        user.set('meta_last_validated', now)
        $app.save(user)
      }

      let errorMessage = 'Falha na autenticação com o Meta. O token pode ser inválido ou expirado.'
      if (errorPayload && errorPayload.error && errorPayload.error.message) {
        const msg = errorPayload.error.message
        if (errorCode === 100) {
          errorMessage =
            'Erro (#100): Permissão Ausente. Verifique os escopos ads_read ou whatsapp_business_management no seu Meta App.'
        } else if (
          msg.includes('does not exist') ||
          (errorPayload.error && errorPayload.error.error_subcode === 33) ||
          msg.toLowerCase().includes('missing permission') ||
          msg.toLowerCase().includes('permission')
        ) {
          errorMessage = `Erro de Permissão/ID Meta: O Pixel ID não existe ou o token CAPI não tem permissão para acessá-lo. Detalhe do Meta: ${msg} (Código: ${errorCode})`
        } else if (
          msg.includes('Invalid OAuth access token') ||
          msg.includes('invalid oauth access token data') ||
          msg.includes('invalid') ||
          errorCode === 190
        ) {
          errorMessage = `Erro de autenticação com o Meta: Token inválido ou expirado. Código: 190`
        } else {
          errorMessage = `Meta retornou: ${msg}. Dica: Verifique as configurações do seu Pixel e Token CAPI.`
        }
      } else if (typeof errorPayload === 'string') {
        errorMessage = errorPayload
      } else if (typeof errorPayload === 'object') {
        errorMessage = JSON.stringify(errorPayload)
      }

      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const timeString = oneHourAgo.toISOString().replace('T', ' ')

        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const existingLogs = $app.findRecordsByFilter(
          logsCol.id,
          "user_id = {:userId} && type = 'error' && message = 'Falha na validação do Token CAPI' && created >= {:time}",
          '-created',
          1,
          0,
          { userId: e.auth.id, time: timeString },
        )

        if (!existingLogs || existingLogs.length === 0) {
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', e.auth.id)
          logRecord.set('type', 'error')
          logRecord.set('message', 'Falha na validação do Token CAPI')
          logRecord.set('details', errorMessage)
          logRecord.set('payload', {
            statusCode: res.statusCode,
            metaResponse: errorPayload,
            count: 1,
            fbtrace_id: fbtraceId,
          })
          $app.save(logRecord)
        } else {
          const logRecord = existingLogs[0]
          const currentPayload = logRecord.get('payload') || {}
          currentPayload.count = (currentPayload.count || 1) + 1
          currentPayload.metaResponse = errorPayload
          currentPayload.statusCode = res.statusCode
          currentPayload.fbtrace_id = fbtraceId
          logRecord.set('payload', currentPayload)
          logRecord.set('details', errorMessage)
          $app.save(logRecord)
        }
      } catch (logErr) {}

      return e.json(400, {
        message: errorMessage,
        error: errorPayload,
        fbtrace_id: fbtraceId,
        code: errorCode,
      })
    }
  },
  $apis.requireAuth(),
)

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
      url: `https://graph.facebook.com/v19.0/${pixelId}?access_token=${capiToken}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
      if (errorPayload && errorPayload.error) {
        if (errorPayload.error.code === 190) {
          isOAuthError = true
        } else if (
          errorPayload.error.code === 100 ||
          errorPayload.error.error_subcode === 33 ||
          String(errorPayload.error.message).includes('does not exist') ||
          String(errorPayload.error.message).includes('permission')
        ) {
          isPermissionError = true
        }
      }

      if (user) {
        user.set(
          'meta_token_status',
          isOAuthError ? 'expired' : isPermissionError ? 'error: permission_denied' : 'invalid',
        )
        user.set('meta_last_validated', now)
        $app.save(user)
      }

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', e.auth.id)
        logRecord.set('type', 'error')
        logRecord.set('message', 'Falha na validação do Token CAPI')
        logRecord.set(
          'details',
          typeof errorPayload === 'object' ? JSON.stringify(errorPayload) : String(errorPayload),
        )
        logRecord.set('payload', { statusCode: res.statusCode, metaResponse: errorPayload })
        $app.save(logRecord)
      } catch (logErr) {}

      let errorMessage = 'Falha na autenticação com o Meta. O token pode ser inválido ou expirado.'
      if (errorPayload && errorPayload.error && errorPayload.error.message) {
        const msg = errorPayload.error.message
        if (
          msg.includes('does not exist') ||
          (errorPayload.error && errorPayload.error.code === 100) ||
          (errorPayload.error && errorPayload.error.error_subcode === 33) ||
          msg.includes('Missing Permissions') ||
          msg.includes('permission')
        ) {
          errorMessage = `Erro de Permissão/ID Meta: O Pixel ID não existe ou o token CAPI não tem permissão para acessá-lo. Código: ${errorPayload.error.code}`
        } else if (
          msg.includes('Invalid OAuth access token') ||
          msg.includes('invalid oauth access token data') ||
          msg.includes('invalid') ||
          (errorPayload.error && errorPayload.error.code === 190)
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

      return e.json(400, { message: errorMessage, error: errorPayload })
    }
  },
  $apis.requireAuth(),
)

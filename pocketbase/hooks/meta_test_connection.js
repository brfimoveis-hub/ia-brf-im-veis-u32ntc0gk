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

    const user = e.auth
    const now = new Date().toISOString()

    // 1. Debug Token Request for Scope Deep-Scan
    const debugRes = $http.send({
      url: `https://graph.facebook.com/v19.0/debug_token?input_token=${capiToken}&access_token=${capiToken}`,
      method: 'GET',
      timeout: 15,
    })

    let missingScopes = []
    let isDebugSuccess = debugRes.statusCode === 200
    let debugData = {}

    if (isDebugSuccess && debugRes.json && debugRes.json.data) {
      debugData = debugRes.json.data
      const scopes = debugData.scopes || []
      const requiredScopes = ['ads_read', 'whatsapp_business_management']
      missingScopes = requiredScopes.filter((s) => !scopes.includes(s))
    }

    // 2. Pixel Authorization Test
    const res = $http.send({
      url: `https://graph.facebook.com/v19.0/${pixelId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${capiToken}`,
      },
      timeout: 15,
    })

    const isPixelSuccess = res.statusCode === 200

    // Evaluate combined success
    if (isPixelSuccess && missingScopes.length === 0) {
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
        logRecord.set('payload', { debugToken: debugData, pixelResponse: res.json })
        $app.save(logRecord)
      } catch (logErr) {}

      return e.json(200, {
        success: true,
        message: 'Token and Pixel validated successfully',
        missing_scopes: [],
        fbtrace_id: (res.json && res.json.fbtrace_id) || '',
      })
    } else {
      const errorPayload = !isPixelSuccess
        ? res.json || res.raw || 'Erro desconhecido'
        : debugRes.json || debugRes.raw || 'Erro no debug_token'

      let isPermissionError = missingScopes.length > 0
      let isOAuthError = false
      let fbtraceId = ''
      let errorCode = null

      if (!isPixelSuccess && errorPayload && errorPayload.error) {
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
      } else if (!isDebugSuccess && debugRes.json && debugRes.json.error) {
        fbtraceId = debugRes.json.error.fbtrace_id || ''
        errorCode = debugRes.json.error.code
        if (errorCode === 190) {
          isOAuthError = true
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

      if (missingScopes.length > 0) {
        errorMessage =
          'Erro (#100): Permissão Ausente. Verifique os escopos ads_read ou whatsapp_business_management no seu Meta App.'
        errorCode = 100
      } else if (
        !isPixelSuccess &&
        errorPayload &&
        errorPayload.error &&
        errorPayload.error.message
      ) {
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
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', e.auth.id)
        logRecord.set('type', 'error')
        logRecord.set('message', 'Falha na validação do Token CAPI')
        logRecord.set('details', errorMessage)
        logRecord.set('payload', {
          statusCode: isPixelSuccess ? debugRes.statusCode : res.statusCode,
          metaResponse: errorPayload,
          debugResponse: debugData,
          missingScopes: missingScopes,
          fbtrace_id: fbtraceId,
        })
        $app.save(logRecord)
      } catch (logErr) {}

      return e.json(400, {
        success: false,
        message: errorMessage,
        error: errorPayload,
        fbtrace_id: fbtraceId,
        code: errorCode,
        missing_scopes: missingScopes,
      })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = (body.pixelId || '').trim()
    const capiToken = (body.capiToken || '').replace(/^Bearer\s+/i, '').trim()

    if (!pixelId || !capiToken) {
      return e.badRequestError('Pixel ID e Token CAPI são obrigatórios')
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
        user.set('meta_token_status', 'valid')
        user.set('meta_last_validated', now)
        $app.save(user)
      }
      return e.json(200, { success: true, data: res.json })
    } else {
      const errorPayload = res.json || res.raw || 'Erro desconhecido'

      if (user) {
        user.set('meta_token_status', 'invalid')
        user.set('meta_last_validated', now)
        $app.save(user)
      }

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', e.auth.id)
        logRecord.set('type', 'remarketing_error')
        logRecord.set('message', 'Falha no teste de conexão com Meta.')
        logRecord.set(
          'details',
          typeof errorPayload === 'object' ? JSON.stringify(errorPayload) : String(errorPayload),
        )
        logRecord.set('payload', { statusCode: res.statusCode, metaResponse: errorPayload })
        $app.save(logRecord)
      } catch (logErr) {}

      let errorMessage = 'Falha na autenticação com o Meta'
      if (errorPayload && errorPayload.error && errorPayload.error.message) {
        errorMessage = errorPayload.error.message
      } else if (typeof errorPayload === 'string') {
        errorMessage = errorPayload
      } else if (typeof errorPayload === 'object') {
        errorMessage = JSON.stringify(errorPayload)
      }

      return e.badRequestError(errorMessage, errorPayload)
    }
  },
  $apis.requireAuth(),
)

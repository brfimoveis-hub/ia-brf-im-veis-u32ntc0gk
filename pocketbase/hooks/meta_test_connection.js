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

    if (res.statusCode === 200) {
      return e.json(200, { success: true, data: res.json })
    } else {
      const errorPayload = res.json || res.raw || 'Erro desconhecido'
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', e.auth.id)
        logRecord.set('type', 'error')
        logRecord.set('message', 'Falha no teste de conexão com Meta.')
        logRecord.set(
          'details',
          typeof errorPayload === 'object' ? JSON.stringify(errorPayload) : String(errorPayload),
        )
        logRecord.set('payload', { statusCode: res.statusCode, metaResponse: errorPayload })
        $app.save(logRecord)
      } catch (logErr) {}

      return e.badRequestError('Falha na autenticação com o Meta', errorPayload)
    }
  },
  $apis.requireAuth(),
)

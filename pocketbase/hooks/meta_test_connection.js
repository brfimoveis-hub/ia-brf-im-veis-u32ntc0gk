routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = (body.pixelId || '').trim()
    const capiToken = (body.capiToken || '').trim()

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
      return e.badRequestError(
        'Falha na autenticação com o Meta',
        res.json || res.raw || 'Erro desconhecido',
      )
    }
  },
  $apis.requireAuth(),
)

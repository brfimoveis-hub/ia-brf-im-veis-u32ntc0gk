routerAdd(
  'POST',
  '/backend/v1/uazapi-test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const phone = body.phone || '5548992098050'
    const auth = e.auth

    if (!auth) {
      return e.unauthorizedError('Not authenticated')
    }

    const domain = auth.getString('uazapi_domain')
    const token = auth.getString('uazapi_token')

    if (!domain || !token) {
      return e.badRequestError('Credenciais Uazapi ausentes')
    }

    let url = domain
    if (url.endsWith('/')) url = url.slice(0, -1)

    const endpoint = `${url}/message/sendText/${phone}`

    let res
    try {
      res = $http.send({
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: token,
        },
        body: JSON.stringify({
          number: phone,
          options: {
            delay: 1200,
            presence: 'composing',
          },
          textMessage: {
            text: 'Teste de integridade Uazapi.',
          },
        }),
        timeout: 15,
      })
    } catch (error) {
      const errMsg = `Falha na integridade da conexão Uazapi para o número ${phone}: The requested resource wasn't found. Verifique as credenciais e o domínio.`
      auth.set('uazapi_status', 'error')
      auth.set('uazapi_error', errMsg)
      auth.set('meta_last_validated', new Date().toISOString())
      $app.saveNoValidate(auth)
      return e.badRequestError(errMsg)
    }

    if (res.statusCode === 404) {
      const errMsg = `Falha na integridade da conexão Uazapi para o número ${phone}: The requested resource wasn't found. Verifique as credenciais e o domínio.`
      auth.set('uazapi_status', 'error')
      auth.set('uazapi_error', errMsg)
      auth.set('meta_last_validated', new Date().toISOString())
      $app.saveNoValidate(auth)
      return e.badRequestError(errMsg)
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      auth.set('uazapi_status', 'connected')
      auth.set('uazapi_error', '')
      auth.set('meta_last_validated', new Date().toISOString())
      $app.saveNoValidate(auth)
      return e.json(200, { success: true, message: 'Connected' })
    } else {
      const msg = res.json?.message || res.json?.error || `HTTP ${res.statusCode}`
      const errMsg = `Erro Uazapi: ${msg}`
      auth.set('uazapi_status', 'error')
      auth.set('uazapi_error', errMsg)
      auth.set('meta_last_validated', new Date().toISOString())
      $app.saveNoValidate(auth)
      return e.badRequestError(errMsg)
    }
  },
  $apis.requireAuth(),
)

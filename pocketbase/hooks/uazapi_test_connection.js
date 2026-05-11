routerAdd(
  'POST',
  '/backend/v1/uazapi/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    let domain = body.domain || 'https://iabrfimveis.uazapi.com'
    const instance = body.instance || '554892098050'
    const userToken = body.token || ''

    if (domain && !domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain
    }

    if (domain.endsWith('/')) domain = domain.slice(0, -1)
    if (domain.endsWith('/api')) domain = domain.slice(0, -4)
    if (domain.endsWith('/v1')) domain = domain.slice(0, -3)

    const reqUrl = domain + '/instance/connectionState/' + instance

    const headers = { 'Content-Type': 'application/json' }

    if (userToken) {
      headers['AdminToken'] = userToken
      headers['apikey'] = userToken
    } else {
      headers['AdminToken'] = 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
      headers['apikey'] = 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
    }

    try {
      const res = $http.send({
        url: reqUrl,
        method: 'GET',
        headers: headers,
        timeout: 15,
      })

      // Prevent sending 401/403 as HTTP response status from our proxy API.
      // If we return 401, the PocketBase JS SDK auto-clears the auth token,
      // destroying the frontend session and forcing a redirect to /login.
      if (res.statusCode === 401 || res.statusCode === 403) {
        return e.json(400, {
          message: 'Unauthorized at target',
          error: 'Acesso negado no Uazapi (Token inválido).',
        })
      }

      if (res.statusCode === 404) {
        return e.json(400, {
          message: 'Instance not found',
          error:
            'Verifique o Endpoint URL e a Instância WhatsApp. O servidor retornou 404 Not Found.',
        })
      }

      if (res.statusCode === 504) {
        return e.json(504, { message: 'Timeout' })
      }

      return e.json(res.statusCode, res.json || { statusCode: res.statusCode })
    } catch (err) {
      const msg = err.message.toLowerCase()
      if (msg.includes('timeout') || msg.includes('deadline exceeded')) {
        return e.json(504, { message: 'Timeout' })
      }
      if (msg.includes('not found')) {
        return e.json(400, {
          message: 'Instance not found',
          error:
            'Verifique o Endpoint URL e a Instância WhatsApp. O servidor retornou 404 Not Found.',
        })
      }
      return e.internalServerError(err.message)
    }
  },
  $apis.requireAuth(),
)

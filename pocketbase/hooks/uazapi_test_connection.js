routerAdd(
  'POST',
  '/backend/v1/uazapi/test-connection',
  (e) => {
    const body = e.requestInfo().body
    const { domain, token, adminToken, instanceNumber } = body

    if (!domain || !token || !instanceNumber) {
      return e.json(200, {
        success: false,
        state: 'disconnected',
        error: 'Campos obrigatórios ausentes.',
      })
    }

    let url = domain
    if (url.endsWith('/')) url = url.slice(0, -1)

    const headers = {
      'Content-Type': 'application/json',
      token: token,
    }
    if (adminToken) {
      headers['admintoken'] = adminToken
    }

    try {
      const res = $http.send({
        url: `${url}/instance/connectionState/${instanceNumber}`,
        method: 'GET',
        headers: headers,
        timeout: 15,
      })

      if (res.statusCode === 404 || res.statusCode === 405) {
        return e.json(200, {
          success: false,
          state: 'disconnected',
          error: `Instância não encontrada. Verifique se o número ${instanceNumber} e o endpoint são válidos.`,
        })
      }

      if (res.statusCode === 429) {
        return e.json(200, {
          success: false,
          state: 'disconnected',
          error:
            'Limite de instâncias ou requisições atingido. Por favor, tente novamente mais tarde.',
        })
      }

      if (res.statusCode !== 200) {
        return e.json(200, {
          success: false,
          state: 'disconnected',
          error: `API Error: ${res.statusCode}`,
        })
      }

      let rawState = res.json?.instance?.state || res.json?.state || 'close'
      let mappedState = 'disconnected'
      if (rawState === 'open' || rawState === 'connected') mappedState = 'connected'
      else if (rawState === 'connecting') mappedState = 'connecting'

      return e.json(200, {
        success: true,
        state: mappedState,
        raw: res.json,
      })
    } catch (err) {
      return e.json(200, {
        success: false,
        state: 'disconnected',
        error:
          'Failed to reach the specified domain. Please check the URL and ensure it handles HTTPS.',
      })
    }
  },
  $apis.requireAuth(),
)

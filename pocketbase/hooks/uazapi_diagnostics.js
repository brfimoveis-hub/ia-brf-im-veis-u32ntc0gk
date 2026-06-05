routerAdd(
  'GET',
  '/backend/v1/uazapi/diagnostics',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('auth required')

    let rawDomain = (user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com').trim()
    let domain = rawDomain
    if (!domain.startsWith('http')) domain = 'https://' + domain
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const token = (
      user.getString('uazapi_token') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
    ).trim()
    const instance = (user.getString('uazapi_instance_number') || '554892098050').trim()

    if (!token || !instance) {
      return e.json(400, {
        connection_step: 'Validation',
        status_code: 400,
        api_response: 'Missing token or instance number',
      })
    }

    const headers = {
      'Content-Type': 'application/json',
      apikey: token,
      Authorization: token.toLowerCase().startsWith('bearer ') ? token : 'Bearer ' + token,
    }

    let stateRes = null
    try {
      try {
        stateRes = $http.send({
          url: `${domain}/instance/connectionState/${instance}`,
          method: 'GET',
          headers: headers,
          timeout: 10,
        })
      } catch (err) {
        stateRes = $http.send({
          url: `${domain}/instance/connectionState/${instance}`,
          method: 'GET',
          headers: headers,
          timeout: 10,
        })
      }

      if (stateRes.statusCode === 404) {
        try {
          const apiV1Res = $http.send({
            url: `${domain}/api/v1/instance/connectionState/${instance}`,
            method: 'GET',
            headers: headers,
            timeout: 10,
          })
          if (apiV1Res.statusCode !== 404) {
            stateRes = apiV1Res
          }
        } catch (err) {}
      }
    } catch (err) {
      return e.json(502, {
        connection_step: 'DNS/Domain or Timeout',
        status_code: 0,
        api_response: err.message,
      })
    }

    let data = {}
    try {
      data = stateRes.json || {}
    } catch (_) {}

    let step = 'Instance State'
    if (stateRes.statusCode === 401 || stateRes.statusCode === 403) {
      step = 'Authentication'
    } else if (stateRes.statusCode === 404) {
      step = 'Instance ID'
    }

    let statusStr = 'disconnected'
    let errorReason = ''
    if (stateRes.statusCode >= 200 && stateRes.statusCode < 300) {
      const st =
        data?.instance?.status || data?.instance?.state || data?.status || data?.state || ''
      if (st === 'connected' || st === 'open' || st === 'loggedIn') {
        statusStr = 'online'
      } else if (st === 'connecting' || data?.instance?.qrcode || data?.qrcode) {
        statusStr = 'qr_ready'
      }
    } else {
      errorReason = data?.message || data?.error || `Erro da API (${stateRes.statusCode})`
    }

    if (
      user.getString('uazapi_status') !== statusStr ||
      user.getString('uazapi_error') !== errorReason
    ) {
      user.set('uazapi_status', statusStr)
      user.set('uazapi_error', errorReason)
      try {
        $app.saveNoValidate(user)
      } catch (_) {}
    }

    const finalCode =
      stateRes.statusCode >= 200 && stateRes.statusCode < 300 ? 200 : stateRes.statusCode

    return e.json(finalCode, {
      connection_step: step,
      status_code: stateRes.statusCode,
      api_response: data,
    })
  },
  $apis.requireAuth(),
)

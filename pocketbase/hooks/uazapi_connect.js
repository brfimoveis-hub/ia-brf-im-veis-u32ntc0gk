routerAdd(
  'POST',
  '/backend/v1/uazapi/connect',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const instance = (user.getString('uazapi_instance_number') || '554892098050').trim()
    let rawDomain = (user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com').trim()
    let domain = rawDomain
    if (!domain.startsWith('http')) domain = 'https://' + domain
    domain = domain.replace(/([^:]\/)\/+/g, '$1')
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const token = (user.getString('uazapi_token') || '6df3aaaa-9198-40aa-9d0c-da3abd9c1934').trim()

    const headers = {
      'Content-Type': 'application/json',
      apikey: token,
      Authorization: token.toLowerCase().startsWith('bearer ') ? token : 'Bearer ' + token,
      instance: instance,
    }

    try {
      let res
      try {
        res = $http.send({
          url: `${domain}/instance/connect/${instance}`,
          method: 'GET',
          headers: headers,
          timeout: 15,
        })
      } catch (err) {
        res = $http.send({
          url: `${domain}/instance/connect/${instance}`,
          method: 'GET',
          headers: headers,
          timeout: 15,
        })
      }

      if (res.statusCode === 404) {
        try {
          const apiV1Res = $http.send({
            url: `${domain}/api/v1/instance/connect/${instance}`,
            method: 'GET',
            headers: headers,
            timeout: 15,
          })
          if (apiV1Res.statusCode !== 404) {
            res = apiV1Res
          }
        } catch (err) {}
      }

      let data = {}
      try {
        data = res.json || {}
      } catch (_) {}

      let statusStr = 'qr_ready'
      if (data.status === 'connected' || data.connected === true || data.state === 'open') {
        statusStr = 'online'
      }

      if (user.getString('uazapi_status') !== statusStr) {
        user.set('uazapi_status', statusStr)
        user.set('uazapi_error', '')
        $app.saveNoValidate(user)
      }

      return e.json(200, { success: true, status: statusStr, data })
    } catch (err) {
      throw new BadRequestError(`Falha na requisição de conexão: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

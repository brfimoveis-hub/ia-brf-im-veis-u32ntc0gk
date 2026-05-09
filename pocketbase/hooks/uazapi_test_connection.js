routerAdd(
  'POST',
  '/backend/v1/uazapi-test-connection',
  (e) => {
    const body = e.requestInfo().body

    const user = e.auth
    if (!user) {
      throw new UnauthorizedError('Unauthorized')
    }

    // Use provided phone or fallback to user's campaign phone
    const phone = body.phone || user.getString('meta_campaign_phone') || '5548992098050'
    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_token')

    if (!domain || !token) {
      return e.badRequestError('Domínio e token do Uazapi não configurados')
    }

    let baseUrl = domain.trim()
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    try {
      // Perform GET request for connection state as per Uazapi/Evolution API spec
      // Using GET prevents 405 Method Not Allowed
      const res = $http.send({
        url: `${baseUrl}/instance/connectionState/${phone}`,
        method: 'GET',
        headers: {
          apikey: token,
          Authorization: `Bearer ${token}`, // Fallback for standard auth
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        user.set('uazapi_status', 'online')
        user.set('uazapi_error', '')
        $app.saveNoValidate(user)
        return e.json(200, res.json)
      } else {
        user.set('uazapi_status', 'error')
        let errMsg = `A API retornou status ${res.statusCode}`
        try {
          if (res.json && res.json.message) {
            errMsg += `: ${res.json.message}`
          } else if (res.json && res.json.error) {
            errMsg += `: ${res.json.error}`
          }
        } catch (_) {}
        user.set('uazapi_error', errMsg)
        $app.saveNoValidate(user)

        if (res.statusCode === 404 || res.statusCode === 405) {
          return e.badRequestError(
            `Erro de conexão (404/405). Verifique se o domínio e a instância estão corretos. O servidor retornou instância não encontrada.`,
          )
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          return e.badRequestError('Token não autorizado (401/403).')
        }

        return e.badRequestError(errMsg)
      }
    } catch (err) {
      user.set('uazapi_status', 'error')
      user.set('uazapi_error', 'Falha de conexão com o servidor Uazapi: ' + err.message)
      $app.saveNoValidate(user)
      return e.badRequestError('Falha ao comunicar com Uazapi')
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/uazapi/connect',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const body = e.requestInfo().body || {}

    // Only update credentials if explicitly provided in the request
    let domain = body.domain || user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const token = body.token || user.getString('uazapi_token')
    const instance = body.instance || user.getString('uazapi_instance_number')

    if (!instance || !token) {
      throw new BadRequestError('Token e instância são obrigatórios para conectar.')
    }

    // Save provided credentials
    user.set('uazapi_domain', domain)
    user.set('uazapi_token', token)
    user.set('uazapi_instance_number', instance)
    user.set('uazapi_status', 'connecting')
    user.set('uazapi_error', '')

    $app.saveNoValidate(user)

    try {
      const res = $http.send({
        url: `${domain}/instance/connect/${instance}`,
        method: 'GET',
        headers: {
          apikey: token,
          Authorization: 'Bearer ' + token,
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, {
          success: true,
          message: 'Conexão iniciada. Verifique o status para o QR Code.',
          data: res.json,
        })
      }

      throw new Error(res.json?.message || `Erro da API (${res.statusCode})`)
    } catch (err) {
      user.set('uazapi_status', 'error')
      user.set('uazapi_error', err.message)
      $app.saveNoValidate(user)

      throw new BadRequestError(`Falha ao iniciar conexão: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

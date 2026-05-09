routerAdd(
  'POST',
  '/backend/v1/uazapi-test-connection',
  (e) => {
    const user = e.auth
    if (!user) {
      return e.unauthorizedError('Unauthorized')
    }

    const body = e.requestInfo().body || {}
    const phone = body.phone || '5548992098050'

    let domain = user.getString('uazapi_domain')
    let token = user.getString('uazapi_token')

    if (!domain || !token) {
      user.set('uazapi_status', 'error')
      user.set('uazapi_error', 'Domínio e token são obrigatórios.')
      $app.save(user)
      return e.badRequestError('Domínio e token são obrigatórios.')
    }

    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1)
    }

    try {
      const res = $http.send({
        url: `${domain}/instance/info`, // common endpoint to test connection
        method: 'GET',
        headers: {
          apikey: token,
          Authorization: `Bearer ${token}`,
        },
        timeout: 10,
      })

      if (res.statusCode === 404 || res.statusCode === 405) {
        user.set('uazapi_status', 'error')
        user.set('uazapi_error', `Erro na API Uazapi: Status ${res.statusCode}`)
        $app.save(user)
        return e.json(res.statusCode, {
          message: `Method Not Allowed or Not Found: ${res.statusCode}`,
        })
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        user.set('uazapi_status', 'connected')
        user.set('uazapi_error', '')
        $app.save(user)
        return e.json(200, { success: true })
      } else {
        user.set('uazapi_status', 'error')
        user.set('uazapi_error', `Erro inesperado: ${res.statusCode}`)
        $app.save(user)
        return e.badRequestError(`Erro na API Uazapi: ${res.statusCode}`)
      }
    } catch (err) {
      $app.logger().error('Uazapi test connection failed', 'error', err.message)
      user.set('uazapi_status', 'error')
      user.set('uazapi_error', 'Falha de conexão (Timeout ou DNS)')
      $app.save(user)
      return e.badRequestError('Falha de conexão. Verifique o domínio e o token.')
    }
  },
  $apis.requireAuth(),
)

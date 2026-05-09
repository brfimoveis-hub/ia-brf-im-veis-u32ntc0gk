routerAdd(
  'POST',
  '/backend/v1/uazapi-test-connection',
  (e) => {
    const user = e.auth
    if (!user) {
      return e.unauthorizedError('Authentication required')
    }

    let domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_token')

    if (!domain || !token) {
      user.set('uazapi_status', 'error')
      user.set('uazapi_error', 'Credenciais do Uazapi não configuradas.')
      $app.save(user)
      return e.badRequestError('Credenciais não configuradas.')
    }

    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1)
    }

    const body = e.requestInfo().body || {}
    const phone = body.phone || user.getString('meta_campaign_phone') || '5548992098050'

    try {
      const res = $http.send({
        url: `${domain}/instance/fetchInstances`,
        method: 'GET',
        headers: {
          apikey: token,
          Authorization: `Bearer ${token}`,
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        user.set('uazapi_status', 'connected')
        user.set('uazapi_error', '')
        $app.save(user)
        return e.json(200, { success: true, message: 'Connected successfully', phone })
      } else {
        user.set('uazapi_status', 'error')
        if (res.statusCode === 404) {
          user.set(
            'uazapi_error',
            `Falha na integridade da conexão Uazapi para o número ${phone}: The requested resource wasn't found. Verifique as credenciais e o domínio.`,
          )
        } else {
          user.set(
            'uazapi_error',
            `A API retornou status HTTP ${res.statusCode}. Verifique as credenciais e o domínio.`,
          )
        }
        $app.save(user)
        return e.badRequestError(`Falha na conexão: API retornou ${res.statusCode}`)
      }
    } catch (err) {
      user.set('uazapi_status', 'error')
      user.set('uazapi_error', err.message || 'Erro desconhecido ao conectar com Uazapi.')
      $app.save(user)
      return e.badRequestError(err.message || 'Falha na conexão')
    }
  },
  $apis.requireAuth(),
)

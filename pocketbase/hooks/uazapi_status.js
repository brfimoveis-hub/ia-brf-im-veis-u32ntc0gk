routerAdd(
  'GET',
  '/backend/v1/uazapi/status/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    const domain = 'https://iabrfimveis.uazapi.com'

    const user = e.auth
    const adminToken =
      (user && user.getString('uazapi_admin_token')) ||
      $secrets.get('UAZAPI_ADMIN_TOKEN') ||
      'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
    const userApiKey = user && user.getString('uazapi_token')

    try {
      const res = $http.send({
        url: `${domain}/instance/connectionState/${instance}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: userApiKey || adminToken,
          AdminToken: adminToken,
          Authorization: `Bearer ${userApiKey || adminToken}`,
        },
        timeout: 15,
      })

      let jsonRes = {}
      try {
        jsonRes = res.json || {}
      } catch (_) {}
      jsonRes.statusCode = res.statusCode

      // Same protection to avoid killing PB sessions by proxying a 401 error code.
      if (res.statusCode === 401 || res.statusCode === 403) {
        const uazapiErrorMsg = jsonRes.message || jsonRes.error || ''
        let customErrorMsg = 'Acesso negado no Uazapi (Token inválido).'
        if (String(uazapiErrorMsg).toLowerCase().includes('oauth')) {
          customErrorMsg = `Erro de Autenticação (OAuth): Verifique se o Admin Token está correto e não contém espaços. Mensagem do Uazapi: ${uazapiErrorMsg}`
        } else if (uazapiErrorMsg) {
          customErrorMsg = `Acesso negado: ${uazapiErrorMsg}`
        }
        jsonRes.error = customErrorMsg
        $app
          .logger()
          .error(
            'Uazapi Status 401/403 Error',
            'instance',
            instance,
            'domain',
            domain,
            'error',
            uazapiErrorMsg,
          )

        if (user) {
          user.set('uazapi_status', 'unauthorized')
          user.set('uazapi_error', customErrorMsg)
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
        return e.json(401, jsonRes)
      }

      if (res.statusCode === 404) {
        jsonRes.error = `Instância não encontrada no Uazapi. Verifique se o número ${instance} corresponde exatamente ao registrado no painel da Uazapi.`
        $app
          .logger()
          .error('Uazapi Status 404 Instance Not Found', 'instance', instance, 'domain', domain)

        if (user) {
          user.set('uazapi_status', 'error')
          user.set('uazapi_error', jsonRes.error)
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
        return e.json(404, jsonRes)
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (user) {
          const state = jsonRes.status || jsonRes.state || jsonRes.instance?.state || 'disconnected'
          const finalState =
            state === 'connected' || state === 'open' ? 'connected' : 'disconnected'
          user.set('uazapi_status', finalState)
          user.set('uazapi_error', '')
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
      }

      return e.json(res.statusCode === 0 ? 500 : res.statusCode, jsonRes)
    } catch (err) {
      return e.json(500, { error: err.message })
    }
  },
  $apis.requireAuth(),
)

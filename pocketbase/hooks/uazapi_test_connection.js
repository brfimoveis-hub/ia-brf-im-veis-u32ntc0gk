routerAdd(
  'POST',
  '/backend/v1/uazapi/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    let domain = (body.domain || 'https://iabrfimveis.uazapi.com').trim()
    const instance = (body.instance || '554892098050').trim()
    const userToken = (body.token || '').trim()
    const adminToken = (body.admin_token || '').trim()

    if (domain && !domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain
    }

    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const headers = { 'Content-Type': 'application/json' }

    const activeToken = userToken || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
    headers['apikey'] = activeToken
    if (activeToken.toLowerCase().startsWith('bearer ')) {
      headers['Authorization'] = activeToken
    } else {
      headers['Authorization'] = 'Bearer ' + activeToken
    }

    if (adminToken) {
      headers['AdminToken'] = adminToken
    }

    try {
      let res
      const reqPath = '/instance/connectionState/' + instance
      try {
        res = $http.send({
          url: domain + reqPath,
          method: 'GET',
          headers: headers,
          timeout: 15,
        })
      } catch (err) {
        res = $http.send({
          url: domain + reqPath,
          method: 'GET',
          headers: headers,
          timeout: 15,
        })
      }

      if (res.statusCode === 404) {
        try {
          const fallbackRes = $http.send({
            url: domain + '/api/v1' + reqPath,
            method: 'GET',
            headers: headers,
            timeout: 15,
          })
          if (fallbackRes.statusCode !== 404) {
            res = fallbackRes
          }
        } catch (err) {}
      }

      // Prevent sending 401/403 as HTTP response status from our proxy API.
      // If we return 401, the PocketBase JS SDK auto-clears the auth token,
      // destroying the frontend session and forcing a redirect to /login.
      if (res.statusCode === 401 || res.statusCode === 403) {
        const uazapiErrorMsg = res.json && (res.json.message || res.json.error)
        let customErrorMsg = 'Acesso negado no Uazapi (Token inválido).'

        if (uazapiErrorMsg && String(uazapiErrorMsg).toLowerCase().includes('oauth')) {
          customErrorMsg = `Erro de Autenticação (OAuth): Verifique se o Instance Token e o Admin Token não contêm espaços ou caracteres ocultos. Mensagem do Uazapi: ${uazapiErrorMsg}`
        } else if (uazapiErrorMsg) {
          customErrorMsg = `Acesso negado: ${uazapiErrorMsg}`
        }

        $app
          .logger()
          .error(
            'Uazapi 401/403 Error',
            'instance',
            instance,
            'domain',
            domain,
            'error',
            uazapiErrorMsg,
          )

        return e.json(400, {
          message: 'Unauthorized at target',
          error: customErrorMsg,
        })
      }

      if (res.statusCode === 404) {
        $app
          .logger()
          .error(
            'Uazapi 404 Instance Not Found',
            'instance',
            instance,
            'domain',
            domain,
            'payload',
            JSON.stringify(body),
          )
        return e.json(400, {
          message: 'Instance not found',
          error: `Instância não encontrada. Verifique se o ID da Instância (uazapi_instance_number) e o Token estão corretos para o domínio configurado.`,
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
        $app
          .logger()
          .error('Uazapi 404 Exception', 'instance', instance, 'domain', domain, 'message', msg)
        return e.json(400, {
          message: 'Instance not found',
          error: `Instância não encontrada. Verifique se o ID da Instância (uazapi_instance_number) e o Token estão corretos para o domínio configurado.`,
        })
      }
      return e.internalServerError(err.message)
    }
  },
  $apis.requireAuth(),
)

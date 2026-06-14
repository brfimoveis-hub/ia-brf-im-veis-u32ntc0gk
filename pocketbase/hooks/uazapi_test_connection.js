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

    // Fix double slashes and trailing slashes safely
    domain = domain.replace(/([^:]\/)\/+/g, '$1')
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const activeToken = userToken || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      apikey: activeToken,
      Authorization: activeToken.toLowerCase().startsWith('bearer ')
        ? activeToken
        : 'Bearer ' + activeToken,
      instance: instance,
    }

    if (adminToken) {
      headers['AdminToken'] = adminToken
    }

    const logConnection = (status, details, error = null) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'uazapi_connection')
        log.set(
          'message',
          error ? `Test connection failed: ${error}` : `Test connection success: ${status}`,
        )
        log.set('details', details)
        log.set('payload', body)
        $app.save(log)
      } catch (_) {}
    }

    const fetchWithRetry = (reqUrl) => {
      let lastErr = null
      let response = null
      for (let i = 0; i < 3; i++) {
        try {
          response = $http.send({
            url: reqUrl,
            method: 'GET',
            headers: headers,
            timeout: 15,
          })
          if (
            response &&
            response.statusCode !== 502 &&
            response.statusCode !== 503 &&
            response.statusCode !== 504
          ) {
            return response
          }
        } catch (err) {
          lastErr = err
        }
      }
      if (response) return response
      throw lastErr || new Error('Request failed after retries')
    }

    try {
      let res

      try {
        res = fetchWithRetry(domain + '/' + instance + '/instance/connectionState')
      } catch (err) {}

      if (res && res.statusCode === 404) {
        try {
          const res2 = fetchWithRetry(domain + '/instance/connectionState/' + instance)
          if (res2.statusCode !== 404) res = res2
        } catch (err) {}
      }

      if (res && res.statusCode === 404) {
        try {
          const res2b = fetchWithRetry(domain + '/instance/' + instance + '/connectionState')
          if (res2b.statusCode !== 404) res = res2b
        } catch (err) {}
      }

      if (res && res.statusCode === 404) {
        try {
          const res3 = fetchWithRetry(domain + '/api/v1/instance/connectionState/' + instance)
          if (res3.statusCode !== 404) res = res3
        } catch (err) {}
      }

      if (res && res.statusCode === 404) {
        try {
          const res4 = fetchWithRetry(domain + '/api/v1/' + instance + '/instance/connectionState')
          if (res4.statusCode !== 404) res = res4
        } catch (err) {}
      }

      if (!res) throw new Error('Connection failed')

      // Prevent sending 401/403 as HTTP response status from our proxy API.
      // If we return 401, the PocketBase JS SDK auto-clears the auth token,
      // destroying the frontend session and forcing a redirect to /login.
      if (res.statusCode === 401 || res.statusCode === 403) {
        const uazapiErrorMsg = res.json && (res.json.message || res.json.error)
        let customErrorMsg = 'Acesso negado no Uazapi (Token inválido).'

        const safeUazapiErrorMsg =
          typeof uazapiErrorMsg === 'object'
            ? JSON.stringify(uazapiErrorMsg)
            : String(uazapiErrorMsg || '')
        if (safeUazapiErrorMsg && safeUazapiErrorMsg.toLowerCase().includes('oauth')) {
          customErrorMsg = `Erro de Autenticação (OAuth): Verifique se o Instance Token e o Admin Token não contêm espaços ou caracteres ocultos. Mensagem do Uazapi: ${safeUazapiErrorMsg}`
        } else if (safeUazapiErrorMsg) {
          customErrorMsg = `Acesso negado: ${safeUazapiErrorMsg}`
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

        logConnection('error', res.json, customErrorMsg)

        return e.json(400, {
          message: 'Unauthorized at target',
          error: customErrorMsg,
          originalStatus: res.statusCode,
          rawLog: res.json || { code: res.statusCode, message: 'Unauthorized', data: {} },
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
            'response',
            JSON.stringify(res.json || {}),
          )

        logConnection('error', res.json, 'Instância não encontrada (404)')
        return e.json(400, {
          message: 'Instance not found',
          error: `Instance not found. Please verify if the 'Instance Number' should be the Instance Slug (name) instead of the phone number. Detalhe: ${JSON.stringify(res.json || {})}`,
          originalStatus: 404,
          rawLog: res.json || { code: 404, message: 'Not Found.', data: {} },
        })
      }

      if (res.statusCode === 504) {
        logConnection('error', res.json, 'Timeout (504)')
        return e.json(504, { message: 'Timeout', rawLog: res.json || {} })
      }

      logConnection(res.statusCode, res.json || {})

      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const user = e.auth
          if (user) {
            user.set('uazapi_status', 'connected')
            $app.saveNoValidate(user)
          }
        } catch (_) {}
      }

      return e.json(res.statusCode, res.json || { statusCode: res.statusCode })
    } catch (err) {
      const msg = err.message.toLowerCase()
      logConnection('error', {}, err.message)
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

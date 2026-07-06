routerAdd(
  'POST',
  '/backend/v1/uazapi/restart',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('unauthorized')

    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_admin_token') || user.getString('uazapi_token')
    const instance = user.getString('uazapi_instance_number')

    if (!domain || !token || !instance) {
      return e.badRequestError('Configuração UAZAPI incompleta. Salve as credenciais primeiro.')
    }

    const logIntegrationError = (message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'connection_error')
        log.set('message', 'UAZAPI Restart: ' + message)
        log.set('details', { instance: instance, ...details })
        log.set('payload', { domain: domain, instance: instance })
        $app.save(log)
      } catch (_) {}
    }

    let baseUrl = domain.trim()
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      const msg = 'Domínio inválido. Deve começar com http:// ou https://'
      logIntegrationError(msg, { domain: domain })
      return e.badRequestError(msg)
    }

    const restartUrl = baseUrl + '/instance/restart/' + instance

    const headers = {
      apikey: token,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    }

    const sendRequest = (method) => {
      return $http.send({
        url: restartUrl,
        method: method,
        headers: headers,
        timeout: 15,
      })
    }

    let res = null
    let transportError = null

    try {
      res = sendRequest('POST')
    } catch (err) {
      transportError = err
    }

    // Strictly use POST method — no GET fallback.
    // The Evolution API restart endpoint only accepts POST.

    if (!res && transportError) {
      const errorMsg =
        'Erro de rede ao reiniciar instância: ' + (transportError.message || 'unknown')

      try {
        const dbUser = $app.findRecordById('users', user.id)
        dbUser.set('uazapi_status', 'error')
        dbUser.set('uazapi_error', errorMsg)
        $app.save(dbUser)
      } catch (_) {}

      logIntegrationError(errorMsg, { error: transportError.message })

      return e.internalServerError(errorMsg)
    }

    let body = {}
    try {
      body = res.json || {}
    } catch (_) {
      body = {}
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, {
        status: 'success',
        data: body,
        url: restartUrl,
        method: 'POST',
      })
    }

    let errorMsg = ''
    if (res.statusCode === 404) {
      errorMsg =
        'HTTP 404: Not Found - Instância não encontrada. Verifique o Nome/Número da Instância e o Domínio da API.'
    } else if (res.statusCode === 401) {
      errorMsg = 'HTTP 401: Unauthorized - Token inválido ou não autorizado.'
    } else if (res.statusCode === 405) {
      errorMsg =
        'HTTP 405: Method Not Allowed - O endpoint não aceita POST nem GET. Verifique a versão da API UAZAPI.'
    } else {
      errorMsg =
        'HTTP ' +
        res.statusCode +
        ': Falha ao reiniciar instância. ' +
        (body.message || body.error || '')
    }

    try {
      const dbUser = $app.findRecordById('users', user.id)
      dbUser.set('uazapi_status', 'error')
      dbUser.set('uazapi_error', errorMsg)
      $app.save(dbUser)
    } catch (_) {}

    logIntegrationError(errorMsg, {
      statusCode: res.statusCode,
      url: restartUrl,
      method: 'POST',
      response: body,
    })

    return e.json(res.statusCode, {
      status: 'error',
      error: errorMsg,
      code: res.statusCode,
      url: restartUrl,
      details: body,
    })
  },
  $apis.requireAuth(),
)

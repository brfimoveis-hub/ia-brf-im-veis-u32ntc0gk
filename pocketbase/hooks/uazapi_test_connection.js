routerAdd(
  'POST',
  '/backend/v1/uazapi/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const domain = body.domain
    const instance = body.instance
    const token = body.token

    if (!domain || !instance || !token) {
      return e.badRequestError('Missing required parameters (domain, instance, token)')
    }

    let baseUrl = domain
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      return e.badRequestError('Domínio inválido. Deve começar com http:// ou https://')
    }

    const headers = {
      Authorization: 'Bearer ' + token,
      apikey: token,
      'Content-Type': 'application/json',
    }

    const endpoints = ['/instance/connectionState/' + instance, '/instance/status/' + instance]

    let res = null
    let usedUrl = ''
    let lastErr = null

    for (let i = 0; i < endpoints.length; i++) {
      const url = baseUrl + endpoints[i]
      try {
        const r = $http.send({
          url: url,
          method: 'GET',
          headers: headers,
          timeout: 10,
        })
        res = r
        usedUrl = url

        if (r.statusCode !== 404) {
          break
        }
      } catch (err) {
        lastErr = err
      }
    }

    if (!res) {
      return e.json(500, {
        error: 'Erro de rede ao conectar com a instância',
        details: lastErr ? lastErr.message : 'unknown',
        status: 500,
      })
    }

    let data = {}
    try {
      data = res.json || {}
    } catch (_) {
      data = {}
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      let state = 'unknown'
      if (data.instance && data.instance.state) {
        state = data.instance.state
      } else if (data.state) {
        state = data.state
      } else if (data.status) {
        state = data.status
      }

      return e.json(200, {
        status: 'success',
        identifier_used: instance,
        state: state,
        data: data,
      })
    }

    const errorMsg =
      res.statusCode === 404
        ? 'HTTP 404: Not Found - Instância não encontrada'
        : res.statusCode === 401
          ? 'HTTP 401: Unauthorized - Token inválido ou não autorizado'
          : res.statusCode === 405
            ? 'HTTP 405: Method Not Allowed - Método não permitido'
            : 'HTTP ' + res.statusCode + ': Falha na conexão com a instância'

    try {
      const logCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logCol)
      log.set('type', 'integration_error')
      log.set('message', 'UAZAPI Test Connection: ' + errorMsg)
      log.set('details', { statusCode: res.statusCode, url: usedUrl, instance: instance })
      log.set('payload', { domain: domain, instance: instance, response: data })
      $app.save(log)
    } catch (_) {}

    return e.json(res.statusCode, {
      error: errorMsg,
      code: res.statusCode,
      url: usedUrl,
      details: data,
    })
  },
  $apis.requireAuth(),
)

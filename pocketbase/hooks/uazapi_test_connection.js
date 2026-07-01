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

    const phoneFallback = instance.replace(/\D/g, '')

    const headers = {
      Authorization: 'Bearer ' + token,
      apikey: token,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    }

    var check = function (identifier) {
      var endpoints = [
        '/instance/connectionState/' + identifier,
        '/api/instance/' + identifier + '/status',
        '/instance/status/' + identifier,
        '/status?instance=' + identifier,
      ]

      var lastRes = null
      var lastUrl = null
      var lastErr = null

      for (var i = 0; i < endpoints.length; i++) {
        var url = baseUrl + endpoints[i]
        try {
          var res = $http.send({
            url: url,
            method: 'GET',
            headers: headers,
            timeout: 10,
          })
          lastRes = res
          lastUrl = url

          if (res.statusCode >= 200 && res.statusCode < 300) {
            return { res: res, identifier: identifier, url: url }
          }
        } catch (err) {
          lastErr = err
        }
      }

      if (lastRes) {
        return { res: lastRes, identifier: identifier, url: lastUrl }
      }

      throw lastErr || new Error('Connection failed')
    }

    var result
    try {
      result = check(instance)

      if (result.res.statusCode === 404 && phoneFallback && phoneFallback !== instance) {
        try {
          var fbResult = check(phoneFallback)
          if (fbResult.res.statusCode !== 404) {
            result = fbResult
          }
        } catch (fbErr) {
          // Keep original result
        }
      }
    } catch (err) {
      return e.json(500, {
        error: 'Erro de rede ao conectar com a instância',
        details: err.message,
        status: 500,
      })
    }

    var res = result.res
    var identifier = result.identifier
    var url = result.url

    if (res.statusCode >= 200 && res.statusCode < 300) {
      var data = {}
      try {
        data = res.json || {}
      } catch (_) {
        data = {}
      }

      var state = 'unknown'
      if (data.instance && data.instance.state) {
        state = data.instance.state
      } else if (data.state) {
        state = data.state
      } else if (data.status) {
        state = data.status
      }

      return e.json(200, {
        status: 'success',
        identifier_used: identifier,
        state: state,
        data: data,
      })
    }

    var errorDetail = 'No response body'
    try {
      if (res.body) {
        errorDetail = String.fromCharCode.apply(null, new Uint8Array(res.body))
      }
      if (res.json) errorDetail = res.json
    } catch (_) {}

    return e.json(res.statusCode, {
      error:
        res.statusCode === 404
          ? 'Instância não encontrada (404)'
          : res.statusCode === 401
            ? 'Token inválido ou não autorizado (401)'
            : 'Falha na conexão com a instância (' + res.statusCode + ')',
      code: res.statusCode,
      url: url,
      details: errorDetail,
    })
  },
  $apis.requireAuth(),
)

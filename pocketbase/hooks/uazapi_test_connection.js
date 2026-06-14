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

    // Extract digits to attempt fallback check if needed
    const phoneFallback = instance.replace(/\D/g, '')

    const check = (identifier) => {
      try {
        const url = `${baseUrl}/api/instance/${identifier}/status`
        const res = $http.send({
          url: url,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: token,
            'Content-Type': 'application/json',
          },
          timeout: 10,
        })
        return { res, identifier, url }
      } catch (err) {
        throw err
      }
    }

    let result
    try {
      result = check(instance)

      // Fallback logic for 404s
      if (result.res.statusCode === 404 && phoneFallback && phoneFallback !== instance) {
        try {
          const fbResult = check(phoneFallback)
          if (fbResult.res.statusCode !== 404) {
            result = fbResult
          }
        } catch (fbErr) {
          // Ignore fallback errors and keep the original result if fallback fails at transport level
        }
      }
    } catch (err) {
      return e.json(500, {
        error: 'Erro de rede ao conectar com a instância',
        details: err.message,
        status: 500,
      })
    }

    const { res, identifier, url } = result

    if (res.statusCode >= 200 && res.statusCode < 300) {
      let data = {}
      try {
        data = res.json || {}
      } catch (err) {}
      return e.json(200, {
        status: 'success',
        identifier_used: identifier,
        data: data,
      })
    } else {
      let errorDetail = res.body
        ? String.fromCharCode.apply(null, new Uint8Array(res.body))
        : 'No response body'
      try {
        if (res.json) errorDetail = res.json
      } catch (err) {}

      return e.json(res.statusCode, {
        error:
          res.statusCode === 404
            ? 'Instância não encontrada (404)'
            : 'Falha na conexão com a instância',
        code: res.statusCode,
        url: url,
        details: errorDetail,
      })
    }
  },
  $apis.requireAuth(),
)

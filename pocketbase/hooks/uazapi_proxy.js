routerAdd(
  'POST',
  '/backend/v1/uazapi/proxy',
  (e) => {
    const user = e.auth
    const body = e.requestInfo().body || {}
    const endpoint = body.endpoint || ''
    const method = body.method || 'GET'
    const payload = body.payload || null

    let rawDomain = (
      body.domain ||
      user?.getString('uazapi_domain') ||
      'https://iabrfimveis.uazapi.com'
    ).trim()
    const apikey = (
      body.apikey ||
      user?.getString('uazapi_token') ||
      'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
    ).trim()

    // Strip credentials from URL to prevent proxy issues
    let domain = rawDomain.replace(/:\/\/([^@]+)@/, '://')
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const instance = (user?.getString('uazapi_instance_number') || '554892098050').trim()

    let baseEndpoint = endpoint.replace(/^\//, '')
    let prependedEndpoint = baseEndpoint
    let appendedEndpoint = baseEndpoint

    if (!baseEndpoint.includes(instance)) {
      prependedEndpoint = `${instance}/${baseEndpoint}`
      appendedEndpoint = `${baseEndpoint}/${instance}`
    }

    let url = domain + '/' + prependedEndpoint

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    if (apikey) {
      headers['apikey'] = apikey
      headers['Authorization'] = apikey.toLowerCase().startsWith('bearer ')
        ? apikey
        : 'Bearer ' + apikey
      headers['AdminToken'] = apikey
    }

    const fetchWithRetry = (reqUrl) => {
      let lastErr = null
      let response = null
      for (let i = 0; i < 3; i++) {
        try {
          response = $http.send({
            url: reqUrl,
            method: method,
            headers: headers,
            body: payload ? JSON.stringify(payload) : undefined,
            timeout: 15,
          })
          if (
            response &&
            response.statusCode !== 502 &&
            response.statusCode !== 503 &&
            response.statusCode !== 504 &&
            response.statusCode !== 404
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

    let res = null
    let error = null

    try {
      try {
        res = fetchWithRetry(url)
      } catch (err) {
        error = err
      }

      if (res && res.statusCode === 404) {
        let fallbackUrl = domain + '/api/v1/' + prependedEndpoint
        try {
          const apiV1Res = fetchWithRetry(fallbackUrl)
          if (apiV1Res.statusCode !== 404) {
            res = apiV1Res
          }
        } catch (err) {}
      }

      if (res && res.statusCode === 404) {
        let fallbackUrl2 = domain + '/' + appendedEndpoint
        try {
          const apiV1Res2 = fetchWithRetry(fallbackUrl2)
          if (apiV1Res2.statusCode !== 404) {
            res = apiV1Res2
          }
        } catch (err) {}
      }

      if (res && res.statusCode === 404) {
        let fallbackUrl3 = domain + '/api/v1/' + appendedEndpoint
        try {
          const apiV1Res3 = fetchWithRetry(fallbackUrl3)
          if (apiV1Res3.statusCode !== 404) {
            res = apiV1Res3
          }
        } catch (err) {}
      }
    } catch (err) {
      error = err
    }

    if (!res && error) {
      return e.internalServerError(error.message)
    }

    let jsonRes = {}
    try {
      jsonRes = res.json || {}
    } catch (err) {
      jsonRes = {}
    }

    jsonRes.statusCode = res.statusCode

    // Prevent PocketBase SDK from clearing authStore if Uazapi returns 401/403
    let returnStatus = res.statusCode === 0 ? 500 : res.statusCode
    if (returnStatus === 401 || returnStatus === 403) {
      returnStatus = 400
      jsonRes.originalStatus = res.statusCode
      jsonRes.message =
        jsonRes.message || 'Erro de autenticação com a API Uazapi. Verifique o Token.'
    }

    return e.json(returnStatus, jsonRes)
  },
  $apis.requireAuth(),
)

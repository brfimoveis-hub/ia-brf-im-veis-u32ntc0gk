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

    const instance = (user?.getString('uazapi_instance_number') || '5548992098050').trim()

    let baseEndpoint = endpoint.replace(/^\//, '')

    // For absolute endpoint resolution without 404 loops, we build the exact standard URL.
    let url = domain + '/' + baseEndpoint

    // Auto-append instance to Evolution API standard paths if not present
    if (
      !baseEndpoint.includes(instance) &&
      (baseEndpoint.startsWith('message/') || baseEndpoint.startsWith('instance/'))
    ) {
      url = `${domain}/${baseEndpoint}/${instance}`
    }

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      instance: instance,
    }
    if (apikey) {
      headers['apikey'] = apikey
      headers['Authorization'] = apikey.toLowerCase().startsWith('bearer ')
        ? apikey
        : 'Bearer ' + apikey
      headers['AdminToken'] = apikey
    }

    const fetchDirect = (reqUrl) => {
      return $http.send({
        url: reqUrl,
        method: method,
        headers: headers,
        body: payload ? JSON.stringify(payload) : undefined,
        timeout: 15,
      })
    }

    let res = null
    let error = null

    try {
      res = fetchDirect(url)

      // Basic fallback just in case the endpoint structure is slightly different
      if (res && res.statusCode === 404 && !baseEndpoint.includes(instance)) {
        try {
          const fallbackUrl = `${domain}/${instance}/${baseEndpoint}`
          const res2 = fetchDirect(fallbackUrl)
          if (res2.statusCode !== 404) res = res2
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

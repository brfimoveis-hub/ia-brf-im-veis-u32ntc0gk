routerAdd(
  'POST',
  '/backend/v1/uazapi/proxy',
  (e) => {
    const user = e.auth
    const body = e.requestInfo().body || {}
    const endpoint = body.endpoint || ''
    const method = body.method || 'GET'
    const payload = body.payload || null

    let rawDomain =
      body.domain || user?.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    const apikey =
      body.apikey ||
      user?.getString('uazapi_token') ||
      'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    // Strip credentials from URL to prevent proxy issues
    let domain = rawDomain.replace(/:\/\/([^@]+)@/, '://')
    if (domain.endsWith('/')) domain = domain.slice(0, -1)
    if (domain.endsWith('/api')) domain = domain.slice(0, -4)
    if (domain.endsWith('/v1')) domain = domain.slice(0, -3)

    let url = domain
    if (endpoint.startsWith('/')) {
      url += endpoint
    } else {
      url += '/' + endpoint
    }

    const headers = {
      'Content-Type': 'application/json',
    }
    if (apikey) {
      headers['apikey'] = apikey
      headers['Authorization'] = 'Bearer ' + apikey
      headers['AdminToken'] = apikey
    }

    let res = null
    let error = null

    try {
      res = $http.send({
        url: url,
        method: method,
        headers: headers,
        body: payload ? JSON.stringify(payload) : undefined,
        timeout: 15,
      })
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

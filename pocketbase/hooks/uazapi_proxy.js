routerAdd(
  'POST',
  '/backend/v1/uazapi/proxy',
  (e) => {
    const body = e.requestInfo().body || {}
    const endpoint = body.endpoint || ''
    const method = body.method || 'GET'
    const payload = body.payload || null
    let domain = body.domain || 'https://iabrfimveis.uazapi.com'
    const apikey = body.apikey || '6df3aaaa-9198-40aa-9d0c-da3abd9c1934'

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

    return e.json(res.statusCode === 0 ? 500 : res.statusCode, jsonRes)
  },
  $apis.requireAuth(),
)

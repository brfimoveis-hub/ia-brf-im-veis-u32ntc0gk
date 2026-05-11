routerAdd(
  'POST',
  '/backend/v1/uazapi/proxy',
  (e) => {
    const body = e.requestInfo().body || {}
    const endpoint = body.endpoint || ''
    const method = body.method || 'GET'
    const payload = body.payload || null
    const domain = body.domain || 'https://iabrfimveis.uazapi.com'
    const apikey = body.apikey || ''

    let url = domain
    if (url.endsWith('/')) url = url.slice(0, -1)

    if (endpoint.startsWith('/')) {
      url += endpoint
    } else {
      url += '/' + endpoint
    }

    const headers = {
      'Content-Type': 'application/json',
    }
    if (apikey) {
      headers['AdminToken'] = apikey
    }

    try {
      const res = $http.send({
        url: url,
        method: method,
        headers: headers,
        body: payload ? JSON.stringify(payload) : undefined,
        timeout: 15,
      })

      let jsonRes = {}
      try {
        jsonRes = res.json || {}
      } catch (err) {
        jsonRes = {}
      }

      jsonRes.statusCode = res.statusCode

      return e.json(res.statusCode === 0 ? 500 : res.statusCode, jsonRes)
    } catch (err) {
      return e.internalServerError(err.message)
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/uazapi/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    let domain = body.domain || 'https://iabrfimveis.uazapi.com'
    const instance = body.instance || '554892098050'
    const adminToken = body.adminToken || ''
    const userToken = body.token || ''

    if (domain.endsWith('/')) domain = domain.slice(0, -1)
    if (domain.endsWith('/api')) domain = domain.slice(0, -4)
    if (domain.endsWith('/v1')) domain = domain.slice(0, -3)

    const reqUrl = domain + '/instance/connectionState/' + instance

    const headers = { 'Content-Type': 'application/json' }
    if (adminToken) headers['AdminToken'] = adminToken
    if (userToken) headers['apikey'] = userToken

    if (!adminToken && !userToken) {
      headers['apikey'] = 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
    }

    try {
      const res = $http.send({
        url: reqUrl,
        method: 'GET',
        headers: headers,
        timeout: 15,
      })

      if (res.statusCode === 404) {
        return e.notFoundError('Instance not found')
      }

      return e.json(res.statusCode, res.json || { statusCode: res.statusCode })
    } catch (err) {
      return e.internalServerError(err.message)
    }
  },
  $apis.requireAuth(),
)

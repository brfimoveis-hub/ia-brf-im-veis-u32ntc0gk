routerAdd(
  'POST',
  '/backend/v1/uazapi/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const domain = body.domain || 'https://iabrfimveis.uazapi.com'
    const instance = body.instance || '5548992098050'
    const adminToken = body.adminToken || ''
    const userToken = body.token || ''

    let url = domain
    if (url.endsWith('/')) url = url.slice(0, -1)

    const reqUrl = url + '/instance/connectionState/' + instance

    const headers = {}
    if (adminToken) headers['apikey'] = adminToken
    if (userToken) headers['Authorization'] = 'Bearer ' + userToken

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

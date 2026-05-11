routerAdd(
  'GET',
  '/backend/v1/uazapi/status/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    const domain = 'https://iabrfimveis.uazapi.com'

    const adminToken =
      $secrets.get('UAZAPI_ADMIN_TOKEN') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    const res = $http.send({
      url: `${domain}/instance/connectionState/${instance}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: adminToken,
      },
      timeout: 15,
    })

    let jsonRes = {}
    try {
      jsonRes = res.json || {}
    } catch (_) {}
    jsonRes.statusCode = res.statusCode

    return e.json(res.statusCode === 0 ? 500 : res.statusCode, jsonRes)
  },
  $apis.requireAuth(),
)

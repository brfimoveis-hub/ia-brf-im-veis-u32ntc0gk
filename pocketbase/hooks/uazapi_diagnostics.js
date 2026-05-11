routerAdd(
  'GET',
  '/backend/v1/uazapi/diagnostics/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    const domain = 'https://iabrfimveis.uazapi.com'
    const adminToken =
      $secrets.get('UAZAPI_ADMIN_TOKEN') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    const proxyRes = $http.send({
      url: `${domain}/instance/fetchInstances`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json', AdminToken: adminToken },
      timeout: 10,
    })

    let proxyJson = {}
    try {
      proxyJson = proxyRes.json || {}
    } catch (_) {}

    const stateRes = $http.send({
      url: `${domain}/instance/connectionState/${instance}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json', AdminToken: adminToken },
      timeout: 10,
    })

    let stateJson = {}
    try {
      stateJson = stateRes.json || {}
    } catch (_) {}

    const whRes = $http.send({
      url: `${domain}/webhook/find/${instance}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json', AdminToken: adminToken },
      timeout: 10,
    })

    let whJson = {}
    try {
      whJson = whRes.json || {}
    } catch (_) {}

    return e.json(200, {
      proxy: { statusCode: proxyRes.statusCode, data: proxyJson },
      state: { statusCode: stateRes.statusCode, data: stateJson },
      webhook: { statusCode: whRes.statusCode, data: whJson },
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/uazapi/diagnostics/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    let domain = 'https://iabrfimveis.uazapi.com'
    const adminToken =
      $secrets.get('UAZAPI_ADMIN_TOKEN') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    if (domain.endsWith('/')) domain = domain.slice(0, -1)
    if (domain.endsWith('/api')) domain = domain.slice(0, -4)
    if (domain.endsWith('/v1')) domain = domain.slice(0, -3)

    const userRecord = e.auth
    const userAdminToken = userRecord ? userRecord.getString('uazapi_admin_token') : ''
    const userApiKey = userRecord ? userRecord.getString('uazapi_token') : ''

    const headers = { 'Content-Type': 'application/json' }
    if (userAdminToken) headers['AdminToken'] = userAdminToken
    if (userApiKey) headers['apikey'] = userApiKey
    if (!userAdminToken && !userApiKey) headers['apikey'] = adminToken

    const logsCol = $app.findCollectionByNameOrId('system_logs')

    const pingStartTime = new Date().getTime()

    let stateRes = null
    try {
      stateRes = $http.send({
        url: `${domain}/instance/connectionState/${instance}`,
        method: 'GET',
        headers: headers,
        timeout: 10,
      })
    } catch (err) {
      stateRes = { statusCode: 0, message: err.message }
    }

    const pingDuration = new Date().getTime() - pingStartTime

    try {
      const pingLog = new Record(logsCol)
      pingLog.set('type', 'diagnostic_ping')
      pingLog.set('message', `Ping to Uazapi status path`)
      pingLog.set('details', {
        url: `${domain}/instance/connectionState/${instance}`,
        statusCode: stateRes.statusCode,
        durationMs: pingDuration,
      })
      $app.saveNoValidate(pingLog)
    } catch (_) {}

    let proxyRes = null
    try {
      proxyRes = $http.send({
        url: `${domain}/instance/fetchInstances`,
        method: 'GET',
        headers: headers,
        timeout: 10,
      })
    } catch (err) {
      proxyRes = { statusCode: 0 }
    }

    let proxyJson = {}
    try {
      proxyJson = proxyRes.json || {}
    } catch (_) {}

    let stateJson = {}
    try {
      stateJson = stateRes.json || {}
    } catch (_) {}

    let whRes = null
    try {
      whRes = $http.send({
        url: `${domain}/webhook/find/${instance}`,
        method: 'GET',
        headers: headers,
        timeout: 10,
      })
    } catch (err) {
      whRes = { statusCode: 0 }
    }

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

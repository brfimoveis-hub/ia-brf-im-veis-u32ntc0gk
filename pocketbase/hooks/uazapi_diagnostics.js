routerAdd(
  'GET',
  '/backend/v1/uazapi/diagnostics',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const instance = user.getString('uazapi_instance_number')
    let domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    if (domain.endsWith('/')) domain = domain.slice(0, -1)
    const token = user.getString('uazapi_token')

    if (!instance || !domain || !token) {
      throw new BadRequestError('Configuração da Uazapi incompleta.')
    }

    const headers = {
      'Content-Type': 'application/json',
      apikey: token,
      Authorization: 'Bearer ' + token,
    }

    const results = {
      instance: instance,
      domain: domain,
      timestamp: new Date().toISOString(),
      tests: {},
    }

    const runTest = (name, url, method = 'GET') => {
      try {
        const res = $http.send({
          url,
          method,
          headers,
          timeout: 10,
        })
        results.tests[name] = {
          status: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data: res.json || null,
        }
      } catch (err) {
        results.tests[name] = {
          status: 0,
          success: false,
          error: err.message,
        }
      }
    }

    // Do NOT alter user credentials here. This is purely diagnostic.
    runTest('connection_state', `${domain}/instance/connectionState/${instance}`)
    runTest('fetch_instances', `${domain}/instance/fetchInstances`)

    // Save diagnostic result to logs
    try {
      const col = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(col)
      log.set('type', 'uazapi_diagnostics')
      log.set('message', 'Diagnóstico executado')
      log.set('details', results)
      $app.save(log)
    } catch (_) {}

    return e.json(200, results)
  },
  $apis.requireAuth(),
)

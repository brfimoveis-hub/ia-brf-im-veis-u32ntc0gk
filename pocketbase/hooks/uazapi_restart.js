routerAdd(
  'POST',
  '/backend/v1/uazapi/restart',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('unauthorized')

    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_admin_token') || user.getString('uazapi_token')
    const instance = user.getString('uazapi_instance_number')

    if (!domain || !token || !instance) {
      return e.badRequestError('Configuração UAZAPI incompleta. Salve as credenciais primeiro.')
    }

    let baseUrl = domain
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const headers = {
      apikey: token,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    }

    const url = baseUrl + '/instance/restart/' + instance

    const tryMethods = ['POST', 'PUT']
    let res = null
    let lastErr = null

    for (let i = 0; i < tryMethods.length; i++) {
      try {
        const r = $http.send({
          url: url,
          method: tryMethods[i],
          headers: headers,
          timeout: 15,
        })

        if (r.statusCode === 405 && i < tryMethods.length - 1) {
          res = r
          continue
        }

        res = r
        break
      } catch (err) {
        lastErr = err
      }
    }

    if (!res) {
      return e.internalServerError('Erro ao reiniciar: ' + (lastErr ? lastErr.message : 'unknown'))
    }

    let body = {}
    try {
      body = res.json || {}
    } catch (_) {
      body = {}
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, {
        status: 'success',
        data: body,
      })
    }

    return e.json(res.statusCode === 405 ? 400 : res.statusCode, {
      status: 'error',
      error:
        res.statusCode === 404
          ? 'Instância não encontrada (404)'
          : res.statusCode === 401
            ? 'Token inválido ou não autorizado (401)'
            : 'Falha ao reiniciar instância (' + res.statusCode + ')',
      code: res.statusCode,
      details: body,
    })
  },
  $apis.requireAuth(),
)

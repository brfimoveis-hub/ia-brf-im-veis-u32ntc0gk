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

    const primaryUrl = baseUrl + '/instance/restart/' + instance
    const fallbackUrl = baseUrl + '/instance/restart?instance=' + instance

    let res = null
    let lastErr = null

    try {
      res = $http.send({
        url: primaryUrl,
        method: 'POST',
        headers: headers,
        timeout: 15,
      })
    } catch (err) {
      lastErr = err
    }

    if (res && res.statusCode === 405) {
      try {
        const putRes = $http.send({
          url: primaryUrl,
          method: 'PUT',
          headers: headers,
          timeout: 15,
        })
        if (putRes.statusCode !== 405) {
          res = putRes
        }
      } catch (err) {}
    }

    if (!res && lastErr) {
      try {
        res = $http.send({
          url: fallbackUrl,
          method: 'POST',
          headers: headers,
          timeout: 15,
        })
      } catch (err) {}
    }

    if (!res) {
      try {
        const dbUser = $app.findRecordById('users', user.id)
        dbUser.set('uazapi_status', 'error')
        dbUser.set('uazapi_error', 'Erro de rede: ' + (lastErr ? lastErr.message : 'unknown'))
        $app.save(dbUser)
      } catch (_) {}
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

    const errorMsg =
      res.statusCode === 404
        ? 'HTTP 404: Not Found - Instância não encontrada'
        : res.statusCode === 401
          ? 'HTTP 401: Unauthorized - Token inválido ou não autorizado'
          : res.statusCode === 405
            ? 'HTTP 405: Method Not Allowed'
            : 'HTTP ' + res.statusCode + ': Falha ao reiniciar instância'

    try {
      const dbUser = $app.findRecordById('users', user.id)
      dbUser.set('uazapi_status', 'error')
      dbUser.set('uazapi_error', errorMsg)
      $app.save(dbUser)
    } catch (_) {}

    return e.json(res.statusCode === 405 ? 400 : res.statusCode, {
      status: 'error',
      error: errorMsg,
      code: res.statusCode,
      details: body,
    })
  },
  $apis.requireAuth(),
)

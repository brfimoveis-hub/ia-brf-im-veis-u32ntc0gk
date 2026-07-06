routerAdd(
  'GET',
  '/backend/v1/uazapi/qrcode',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('unauthorized')

    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_admin_token') || user.getString('uazapi_token')
    const instance = user.getString('uazapi_instance_number')

    if (!domain || !token || !instance) {
      return e.badRequestError('Configuração UAZAPI incompleta')
    }

    let baseUrl = domain
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    try {
      const res = $http.send({
        url: `${baseUrl}/instance/connect/${instance}`,
        method: 'GET',
        headers: {
          apikey: token,
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, res.json || {})
      }

      const errorMsg =
        res.statusCode === 404
          ? 'HTTP 404: Instância não encontrada. Verifique o Nome da Instância.'
          : res.statusCode === 401
            ? 'HTTP 401: Token inválido ou não autorizado.'
            : 'HTTP ' + res.statusCode + ': Falha ao gerar QR Code'

      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'connection_error')
        log.set('message', 'UAZAPI QR Code: ' + errorMsg)
        log.set('details', { statusCode: res.statusCode, instance: instance })
        log.set('payload', { domain: domain, instance: instance, response: res.json || {} })
        $app.save(log)
      } catch (_) {}

      return e.json(res.statusCode, {
        status: 'error',
        error: errorMsg,
        code: res.statusCode,
      })
    } catch (err) {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'connection_error')
        log.set('message', 'UAZAPI QR Code: ' + (err.message || 'Network error'))
        log.set('details', { instance: instance, error: err.message })
        $app.save(log)
      } catch (_) {}

      return e.internalServerError('Erro ao buscar qrcode: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

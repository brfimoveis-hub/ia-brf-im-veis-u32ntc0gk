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
      return e.badRequestError('Configuração UAZAPI incompleta')
    }

    let baseUrl = domain
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    try {
      const res = $http.send({
        url: `${baseUrl}/instance/restart/${instance}`,
        method: 'PUT',
        headers: { apikey: token },
        timeout: 15,
      })

      return e.json(res.statusCode, res.json || {})
    } catch (err) {
      return e.internalServerError('Erro ao reiniciar: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

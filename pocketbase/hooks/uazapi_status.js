routerAdd(
  'GET',
  '/backend/v1/uazapi/status',
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
        url: `${baseUrl}/instance/connectionState/${instance}`,
        method: 'GET',
        headers: { apikey: token },
        timeout: 15,
      })

      if (res.statusCode === 200 && res.json && res.json.instance) {
        const state = res.json.instance.state
        const dbUser = $app.findRecordById('users', user.id)
        dbUser.set('uazapi_status', state === 'open' ? 'connected' : state)
        $app.save(dbUser)
      }

      return e.json(res.statusCode, res.json || {})
    } catch (err) {
      return e.internalServerError('Erro ao buscar status: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

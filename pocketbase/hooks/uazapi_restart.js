routerAdd(
  'PUT',
  '/backend/v1/uazapi/restart/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_token')

    if (!domain || !token) return e.badRequestError('Credenciais da Uazapi não configuradas.')

    const url = `${domain.replace(/\/$/, '')}/instance/restart/${instance}`

    try {
      const res = $http.send({
        url: url,
        method: 'PUT',
        headers: {
          apikey: token,
        },
        timeout: 30,
      })

      return e.json(res.statusCode, res.json || {})
    } catch (err) {
      return e.badRequestError('Falha ao reiniciar instância: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

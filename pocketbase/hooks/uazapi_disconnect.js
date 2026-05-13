routerAdd(
  'DELETE',
  '/backend/v1/uazapi/disconnect/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_token')

    if (!domain || !token) return e.badRequestError('Credenciais da Uazapi não configuradas.')

    const url = `${domain.replace(/\/$/, '')}/instance/logout/${instance}`

    try {
      const res = $http.send({
        url: url,
        method: 'DELETE',
        headers: {
          apikey: token,
        },
        timeout: 30,
      })

      user.set('uazapi_status', 'Desconectado')
      $app.save(user)

      return e.json(res.statusCode, res.json || {})
    } catch (err) {
      return e.badRequestError('Falha ao desconectar instância: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

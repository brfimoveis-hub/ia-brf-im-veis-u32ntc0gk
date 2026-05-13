routerAdd(
  'GET',
  '/backend/v1/uazapi/qrcode/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_token')

    if (!domain || !token) return e.badRequestError('Credenciais da Uazapi não configuradas.')

    const url = `${domain.replace(/\/$/, '')}/instance/connect/${instance}`

    try {
      const res = $http.send({
        url: url,
        method: 'GET',
        headers: {
          apikey: token,
        },
        timeout: 30,
      })

      return e.json(res.statusCode, res.json || {})
    } catch (err) {
      return e.badRequestError('Falha ao obter QR code: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

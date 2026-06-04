routerAdd(
  'GET',
  '/backend/v1/uazapi/qrcode/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance') || '554892098050'
    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    const domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    const token = user.getString('uazapi_token') || '6df3aaaa-9198-40aa-9d0c-da3abd9c1934'

    if (!domain || !token) return e.badRequestError('Credenciais da Uazapi não configuradas.')

    try {
      const res = $http.send({
        url: `${domain.replace(/\/$/, '')}/instance/connect/${instance}`,
        method: 'GET',
        headers: {
          apikey: token,
          Authorization: 'Bearer ' + token,
        },
        timeout: 30,
      })

      return e.json(res.statusCode === 404 ? 200 : res.statusCode, res.json || {})
    } catch (err) {
      return e.badRequestError('Falha ao obter QR code: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

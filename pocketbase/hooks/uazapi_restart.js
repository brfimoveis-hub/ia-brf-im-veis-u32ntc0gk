routerAdd(
  'POST',
  '/backend/v1/uazapi/restart',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const instance = user.getString('uazapi_instance_number')
    let domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const userApiKey = user.getString('uazapi_token')
    const userAdminToken = user.getString('uazapi_admin_token')
    const adminToken =
      $secrets.get('UAZAPI_ADMIN_TOKEN') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    if (!instance) throw new BadRequestError('Número da instância não configurado.')

    const headers = { 'Content-Type': 'application/json' }

    if (userApiKey) {
      headers['apikey'] = userApiKey
      headers['Authorization'] = 'Bearer ' + userApiKey
    } else {
      headers['apikey'] = adminToken
      headers['Authorization'] = 'Bearer ' + adminToken
    }

    if (userAdminToken) headers['AdminToken'] = userAdminToken

    try {
      const res = $http.send({
        url: `${domain}/instance/restart/${instance}`,
        method: 'PUT',
        headers: headers,
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        user.set('uazapi_status', 'disconnected')
        user.set('uazapi_error', 'Reiniciando instância...')
        $app.saveNoValidate(user)

        return e.json(200, {
          success: true,
          message: 'Instância reiniciada. Verifique o status em breve.',
        })
      }

      if (res.statusCode === 405) {
        return e.json(405, { message: 'Failed to restart API: Method Not Allowed' })
      }
      if (res.statusCode === 401) {
        return e.json(401, { message: 'Failed to restart API: Unauthorized' })
      }

      return e.json(res.statusCode || 400, {
        message: res.json?.message || `Erro da API Uazapi (${res.statusCode})`,
      })
    } catch (err) {
      throw new BadRequestError(`Falha ao reiniciar: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

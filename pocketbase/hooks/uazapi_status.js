routerAdd(
  'GET',
  '/backend/v1/uazapi/status',
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
        url: `${domain}/instance/status/${instance}`,
        method: 'GET',
        headers: headers,
        timeout: 10,
      })

      if (res.statusCode >= 200 && res.statusCode < 300 && res.json) {
        const data = res.json
        let statusStr = 'disconnected'

        if (data.status?.loggedIn || data.instance?.status === 'connected') {
          statusStr = 'connected'
        } else if (data.instance?.qrcode || data.qrcode) {
          statusStr = 'qr_ready'
        }

        if (user.getString('uazapi_status') !== statusStr) {
          user.set('uazapi_status', statusStr)
          user.set('uazapi_error', '')

          if (data.instance?.id) {
            const newName = data.instance.name || data.instance.id
            if (newName && user.getString('uazapi_instance_number') !== newName) {
              user.set('uazapi_instance_number', newName)
            }
          }
          $app.saveNoValidate(user)
        }

        return e.json(200, { success: true, status: statusStr, data })
      }

      throw new BadRequestError(res.json?.message || `Erro da API Uazapi (${res.statusCode})`)
    } catch (err) {
      throw new BadRequestError(`Falha na verificação de status: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

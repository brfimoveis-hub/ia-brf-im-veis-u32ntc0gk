routerAdd(
  'GET',
  '/backend/v1/uazapi/status',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const instance = user.getString('uazapi_instance_number') || '554892098050'
    let domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const token = user.getString('uazapi_token') || '6df3aaaa-9198-40aa-9d0c-da3abd9c1934'

    const headers = {
      'Content-Type': 'application/json',
      apikey: token,
      Authorization: 'Bearer ' + token,
    }

    try {
      const res = $http.send({
        url: `${domain}/instance/status/${instance}`,
        method: 'GET',
        headers: headers,
        timeout: 10,
      })

      let data = {}
      try {
        data = res.json || {}
      } catch (err) {}

      // Tolerate 404 since it may indicate the instance is not paired or connecting
      if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 404) {
        let statusStr = 'disconnected'

        const isConnected =
          data.status === 'connected' ||
          data.connected === true ||
          data.status?.loggedIn ||
          data.instance?.status === 'connected' ||
          data.state === 'open' ||
          data.instance?.state === 'open'

        const isPending =
          data.connected === false ||
          data.instance?.qrcode ||
          data.qrcode ||
          data.base64 ||
          data.state === 'connecting' ||
          data.status === 'qr_ready' ||
          res.statusCode === 404 ||
          data.message === 'Not Found'

        if (isConnected) {
          statusStr = 'connected'
        } else if (isPending) {
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

      throw new BadRequestError(
        data.message || data.error || `Erro da API Uazapi (${res.statusCode})`,
      )
    } catch (err) {
      throw new BadRequestError(`Falha na verificação de status: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

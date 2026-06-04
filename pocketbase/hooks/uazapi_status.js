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
        let errorReason = ''

        let instanceData = null
        if (Array.isArray(data)) {
          instanceData = data.find((i) => i.id === instance || i.token === token) || data[0]
        } else {
          instanceData = data?.instance || data
        }

        if (instanceData) {
          const st = instanceData.status || instanceData.state || ''
          const isConn =
            st === 'connected' ||
            st === 'open' ||
            st === 'loggedIn' ||
            instanceData.connected === true ||
            instanceData.status?.loggedIn

          if (isConn) {
            statusStr = 'connected'
            errorReason = ''
          } else {
            if (
              instanceData.qrcode ||
              instanceData.base64 ||
              st === 'connecting' ||
              st === 'qr_ready'
            ) {
              statusStr = 'qr_ready'
            } else if (st === 'disconnected' || st === 'closed') {
              statusStr = 'disconnected'
            }

            if (instanceData.lastDisconnectReason) {
              errorReason = String(instanceData.lastDisconnectReason)
            } else if (instanceData.message && instanceData.message !== 'Not Found') {
              errorReason = String(instanceData.message)
            }
          }
        }

        if (!instanceData && res.statusCode === 404) {
          statusStr = 'qr_ready'
        }

        if (
          user.getString('uazapi_status') !== statusStr ||
          user.getString('uazapi_error') !== errorReason
        ) {
          user.set('uazapi_status', statusStr)
          user.set('uazapi_error', errorReason)
          // The process must only update the uazapi_status and uazapi_error fields
          $app.saveNoValidate(user)
        }

        return e.json(200, { success: true, status: statusStr, data })
      }

      // Prevent throwing 401/403 to frontend directly
      if (res.statusCode === 401 || res.statusCode === 403) {
        throw new BadRequestError('Credenciais inválidas na API Uazapi. Verifique seu Token.')
      }

      throw new BadRequestError(
        data?.message || data?.error || `Erro da API Uazapi (${res.statusCode})`,
      )
    } catch (err) {
      throw new BadRequestError(`Falha na verificação de status: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

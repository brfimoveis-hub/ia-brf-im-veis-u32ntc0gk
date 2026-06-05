routerAdd(
  'GET',
  '/backend/v1/uazapi/status',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const instance = user.getString('uazapi_instance_number') || '554892098050'
    let rawDomain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'

    let domain = rawDomain.replace(/:\/\/([^@]+)@/, '://')
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const token =
      user.getString('uazapi_token') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    const headers = {
      'Content-Type': 'application/json',
      apikey: token,
      Authorization: 'Bearer ' + token,
    }

    const updateUserStatus = (statusStr, errorReason) => {
      if (
        user.getString('uazapi_status') !== statusStr ||
        user.getString('uazapi_error') !== errorReason
      ) {
        user.set('uazapi_status', statusStr)
        user.set('uazapi_error', errorReason)
        try {
          $app.saveNoValidate(user)
        } catch (_) {}
      }
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

      if (res.statusCode === 404) {
        try {
          const fallbackRes = $http.send({
            url: `${domain}/instance/fetchInstances`,
            method: 'GET',
            headers: headers,
            timeout: 10,
          })
          if (fallbackRes.statusCode >= 200 && fallbackRes.statusCode < 300 && fallbackRes.json) {
            const instances = Array.isArray(fallbackRes.json)
              ? fallbackRes.json
              : fallbackRes.json.instances || []
            const found = instances.find((i) => {
              const iName =
                i.instance?.instanceName || i.instance?.id || i.instanceName || i.id || i.name
              return iName === instance
            })
            if (found) {
              data = found
              res = fallbackRes
            }
          }
        } catch (err) {}
      }

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
            instanceData.status?.loggedIn === true

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
            } else if (instanceData.message) {
              errorReason = String(instanceData.message)
            } else if (data?.message) {
              errorReason = String(data.message)
            }
          }
        }

        if (!instanceData && res.statusCode === 404) {
          statusStr = 'disconnected'
          if (!errorReason) {
            errorReason = data?.message || data?.error || 'Instância não encontrada'
          }
        }

        let profileName = ''
        let currentPresence = ''

        if (instanceData) {
          profileName = instanceData.profileName || instanceData.pushName || ''
          currentPresence = instanceData.currentPresence || ''
        }

        updateUserStatus(statusStr, errorReason)

        return e.json(200, {
          success: true,
          status: statusStr,
          data: {
            profileName,
            currentPresence,
            lastDisconnectReason: errorReason,
            raw: data,
          },
        })
      }

      const errMsg = data?.message || data?.error || `Erro da API Uazapi (${res.statusCode})`
      updateUserStatus('disconnected', errMsg)

      if (res.statusCode === 401 || res.statusCode === 403) {
        throw new BadRequestError('Credenciais inválidas na API Uazapi. Verifique seu Token.')
      }

      throw new BadRequestError(errMsg)
    } catch (err) {
      updateUserStatus('disconnected', err.message)
      throw new BadRequestError(`Falha na verificação de status: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

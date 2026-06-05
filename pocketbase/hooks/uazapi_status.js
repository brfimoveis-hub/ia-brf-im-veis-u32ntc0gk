routerAdd(
  'GET',
  '/backend/v1/uazapi/status',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const instance = (user.getString('uazapi_instance_number') || '554892098050').trim()
    let rawDomain = (user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com').trim()

    if (rawDomain && !rawDomain.startsWith('http://') && !rawDomain.startsWith('https://')) {
      rawDomain = 'https://' + rawDomain
    }

    let domain = rawDomain.replace(/:\/\/([^@]+)@/, '://')
    domain = domain.replace(/([^:]\/)\/+/g, '$1')
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const token = (
      user.getString('uazapi_token') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
    ).trim()

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      apikey: token,
      Authorization: token.toLowerCase().startsWith('bearer ') ? token : 'Bearer ' + token,
      instance: instance,
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

    const fetchWithRetry = (reqUrl) => {
      let lastErr = null
      let response = null
      for (let i = 0; i < 3; i++) {
        try {
          response = $http.send({
            url: reqUrl,
            method: 'GET',
            headers: headers,
            timeout: 15,
          })
          if (
            response &&
            response.statusCode !== 502 &&
            response.statusCode !== 503 &&
            response.statusCode !== 504
          ) {
            return response
          }
        } catch (err) {
          lastErr = err
        }
      }
      if (response) return response
      throw lastErr || new Error('Request failed after retries')
    }

    try {
      let res

      try {
        res = fetchWithRetry(`${domain}/${instance}/instance/status`)
      } catch (err) {}

      if (res && res.statusCode === 404) {
        try {
          const res2 = fetchWithRetry(`${domain}/instance/status/${instance}`)
          if (res2.statusCode !== 404) res = res2
        } catch (err) {}
      }

      if (res && res.statusCode === 404) {
        try {
          const res3 = fetchWithRetry(`${domain}/api/v1/instance/status/${instance}`)
          if (res3.statusCode !== 404) res = res3
        } catch (err) {}
      }

      if (res && res.statusCode === 404) {
        try {
          const res4 = fetchWithRetry(`${domain}/api/v1/${instance}/instance/status`)
          if (res4.statusCode !== 404) res = res4
        } catch (err) {}
      }

      if (!res) throw new Error('Connection failed')

      let data = {}
      try {
        data = res.json || {}
      } catch (err) {}

      if (res.statusCode === 404) {
        try {
          let fallbackRes = $http.send({
            url: `${domain}/instance/fetchInstances`,
            method: 'GET',
            headers: headers,
            timeout: 10,
          })
          if (fallbackRes.statusCode === 404) {
            try {
              fallbackRes = $http.send({
                url: `${domain}/api/v1/instance/fetchInstances`,
                method: 'GET',
                headers: headers,
                timeout: 10,
              })
            } catch (err) {}
          }
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
        let statusStr = 'offline'
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
            statusStr = 'Saudável'
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
              statusStr = 'offline'
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
          statusStr = 'error'
          if (!errorReason) {
            errorReason =
              data?.message ||
              data?.error ||
              `Instância não encontrada (404) - Verifique se a instância ${instance} existe e o token está correto.`
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

      const errMsg =
        data?.message ||
        data?.error ||
        JSON.stringify(data) ||
        `Erro da API Uazapi (Status: ${res.statusCode})`
      updateUserStatus('error', errMsg)

      if (res.statusCode === 401 || res.statusCode === 403) {
        throw new BadRequestError(`Credenciais inválidas. Resposta: ${errMsg}`)
      }

      throw new BadRequestError(errMsg)
    } catch (err) {
      updateUserStatus('error', err.message)
      throw new BadRequestError(`Falha na verificação de status: ${err.message}`)
    }
  },
  $apis.requireAuth(),
)

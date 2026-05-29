routerAdd(
  'POST',
  '/backend/v1/uazapi/v2/connect',
  (e) => {
    const user = e.auth
    const body = e.requestInfo().body || {}
    const rawInstanceName = body.instance_name || (user && user.getString('uazapi_instance_number'))
    const rawDomain =
      body.domain || (user && user.getString('uazapi_domain')) || 'https://iabrfimveis.uazapi.com'
    const rawAdminToken =
      body.admin_token ||
      (user && user.getString('uazapi_admin_token')) ||
      $secrets.get('UAZAPI_ADMIN_TOKEN') ||
      'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    const userApiKey = body.apikey || (user && user.getString('uazapi_token'))

    if (typeof rawInstanceName !== 'string' || rawInstanceName.trim() === '') {
      return e.badRequestError(
        'O parâmetro instance_name é obrigatório e deve ser uma string não vazia.',
      )
    }
    if (typeof rawDomain !== 'string' || rawDomain.trim() === '') {
      return e.badRequestError('O parâmetro domain é obrigatório e deve ser uma string não vazia.')
    }
    if (typeof rawAdminToken !== 'string' || rawAdminToken.trim() === '') {
      return e.badRequestError(
        'O parâmetro admin_token é obrigatório e deve ser uma string não vazia.',
      )
    }

    const instanceName = rawInstanceName.trim()
    const domain = rawDomain.trim()
    const adminToken = rawAdminToken.trim()

    if (adminToken.length !== 50 || !/^[a-zA-Z0-9]+$/.test(adminToken)) {
      return e.badRequestError('O Admin Token deve ter exatamente 50 caracteres alfanuméricos.')
    }

    if (!/^[a-zA-Z0-9-]+$/.test(instanceName)) {
      return e.badRequestError(
        'O nome da instância deve conter apenas caracteres alfanuméricos e hífens.',
      )
    }

    const baseUrl = domain.replace(/\/$/, '')

    const sendRequest = (path, method, reqBody) => {
      let retries = 0
      while (true) {
        try {
          const res = $http.send({
            url: `${baseUrl}${path}`,
            method: method,
            headers: {
              'Content-Type': 'application/json',
              apikey: userApiKey || adminToken,
              AdminToken: adminToken,
              Authorization: `Bearer ${userApiKey || adminToken}`,
            },
            body: reqBody ? JSON.stringify(reqBody) : undefined,
            timeout: 30,
          })

          if (res.statusCode === 429 && retries < 5) {
            retries++
            const delay = Math.pow(2, retries) * 1000
            const start = Date.now()
            while (Date.now() - start < delay) {} // Exponential backoff busy loop
            continue
          }
          return res
        } catch (err) {
          if (retries < 5) {
            retries++
            const delay = Math.pow(2, retries) * 1000
            const start = Date.now()
            while (Date.now() - start < delay) {} // Exponential backoff busy loop
            continue
          }
          throw err
        }
      }
    }

    try {
      // Step 1: Connectivity
      let allRes = sendRequest('/instance/all', 'GET')
      if (allRes.statusCode === 404) {
        allRes = sendRequest('/instance/fetchInstances', 'GET')
      }

      if (allRes.statusCode === 401 || allRes.statusCode === 403) {
        if (user) {
          user.set('uazapi_status', 'unauthorized')
          user.set('uazapi_error', 'Erro de Autenticação: Verifique seu Token e Admin Token.')
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
        return e.json(401, { error: 'Acesso negado no Uazapi (Token inválido).' })
      }

      let instances = []
      if (allRes.statusCode >= 200 && allRes.statusCode < 300) {
        const data = allRes.json || {}
        instances = Array.isArray(data) ? data : data.instances || []
      }

      // Step 2: Existence
      const exists = instances.some(
        (i) =>
          i.instanceName === instanceName ||
          i.name === instanceName ||
          i.instance?.instanceName === instanceName,
      )

      // Step 3: Creation
      if (!exists) {
        const createRes = sendRequest('/instance/create', 'POST', { instanceName, qrcode: true })
        if (createRes.statusCode === 401 || createRes.statusCode === 403) {
          if (user) {
            user.set('uazapi_status', 'unauthorized')
            user.set(
              'uazapi_error',
              'Erro de Autenticação ao criar instância: Verifique seu Token e Admin Token.',
            )
            try {
              $app.saveNoValidate(user)
            } catch (_) {}
          }
          return e.json(401, {
            error: 'Acesso negado no Uazapi (Token inválido ao criar).',
            details: createRes.json || {},
          })
        }
        if (createRes.statusCode >= 400 && createRes.statusCode !== 409) {
          const errorMsg = 'Falha ao criar instância: ' + JSON.stringify(createRes.json || {})
          if (user) {
            user.set('uazapi_status', 'error')
            user.set('uazapi_error', errorMsg)
            try {
              $app.saveNoValidate(user)
            } catch (_) {}
          }
          return e.badRequestError(errorMsg)
        }
      }

      // Step 4: Status
      let statusRes = sendRequest(`/instance/status?name=${instanceName}`, 'GET')
      if (statusRes.statusCode === 404 || statusRes.statusCode === 400) {
        statusRes = sendRequest(`/instance/connectionState/${instanceName}`, 'GET')
      }

      let isConnected = false
      if (statusRes.statusCode >= 200 && statusRes.statusCode < 300) {
        const sData = statusRes.json || {}
        const state = sData.status || sData.state || sData.instance?.state || 'disconnected'
        if (state === 'connected' || state === 'open') isConnected = true
      }

      if (isConnected) {
        if (user) {
          user.set('uazapi_status', 'connected')
          user.set('uazapi_error', '')
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
        return e.json(200, { success: true, status: 'connected' })
      }

      // Step 5: Connection
      let connectRes = sendRequest(`/instance/connect`, 'POST', { instanceName })
      if (connectRes.statusCode === 404) {
        connectRes = sendRequest(`/instance/connect/${instanceName}`, 'GET')
      }

      if (connectRes.statusCode >= 200 && connectRes.statusCode < 300) {
        if (user) {
          user.set('uazapi_status', 'disconnected')
          user.set('uazapi_error', '')
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
        return e.json(200, { success: true, status: 'disconnected', data: connectRes.json || {} })
      }

      const isConnectAuthError = connectRes.statusCode === 401 || connectRes.statusCode === 403
      if (user) {
        user.set('uazapi_status', isConnectAuthError ? 'unauthorized' : 'error')
        if (isConnectAuthError)
          user.set('uazapi_error', 'Erro de Autenticação ao conectar. Verifique seus tokens.')
        try {
          $app.saveNoValidate(user)
        } catch (_) {}
      }
      return e.json(connectRes.statusCode, connectRes.json || { error: 'Falha ao conectar' })
    } catch (err) {
      const isAuthError =
        err.message.includes('401') ||
        err.message.includes('403') ||
        err.message.includes('Unauthorized')
      if (user) {
        user.set('uazapi_status', isAuthError ? 'unauthorized' : 'error')
        user.set('uazapi_error', err.message)
        try {
          $app.saveNoValidate(user)
        } catch (_) {}
      }
      if (isAuthError) return e.json(401, { error: 'Acesso negado no Uazapi (Token inválido).' })
      return e.badRequestError('Erro na integração Uazapi: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

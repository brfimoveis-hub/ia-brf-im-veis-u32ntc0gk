routerAdd(
  'POST',
  '/backend/v1/uazapi/v2/connect',
  (e) => {
    const body = e.requestInfo().body || {}
    const instanceName = body.instance_name
    const domain = body.domain
    const adminToken = body.admin_token

    if (!instanceName || !domain || !adminToken) {
      return e.badRequestError('Faltam parâmetros obrigatórios.')
    }

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
              apikey: adminToken,
              Authorization: `Bearer ${adminToken}`,
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
        if (createRes.statusCode >= 400 && createRes.statusCode !== 409) {
          return e.badRequestError(
            'Falha ao criar instância: ' + JSON.stringify(createRes.json || {}),
          )
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
        return e.json(200, { success: true, status: 'connected' })
      }

      // Step 5: Connection
      let connectRes = sendRequest(`/instance/connect`, 'POST', { instanceName })
      if (connectRes.statusCode === 404) {
        connectRes = sendRequest(`/instance/connect/${instanceName}`, 'GET')
      }

      if (connectRes.statusCode >= 200 && connectRes.statusCode < 300) {
        return e.json(200, { success: true, status: 'disconnected', data: connectRes.json || {} })
      }

      return e.json(connectRes.statusCode, connectRes.json || { error: 'Falha ao conectar' })
    } catch (err) {
      return e.badRequestError('Erro na integração Uazapi: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

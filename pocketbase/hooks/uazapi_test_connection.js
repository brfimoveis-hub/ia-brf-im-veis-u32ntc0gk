routerAdd(
  'POST',
  '/backend/v1/uazapi/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const domain = body.domain
    const instanceNumber = body.instanceNumber
    const token = body.token
    const adminToken = body.adminToken || ''

    if (!domain || !instanceNumber || !token) {
      return e.badRequestError('Dados insuficientes')
    }

    let url = domain
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    try {
      const res = $http.send({
        url: `${url}/instance/connectionState/${instanceNumber}`,
        method: 'GET',
        headers: {
          token: token,
          admintoken: adminToken,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        let state = 'connected'
        if (res.json && res.json.instance && res.json.instance.state) {
          if (res.json.instance.state === 'connecting') state = 'connecting'
          if (res.json.instance.state === 'close') state = 'disconnected'
        }
        return e.json(200, { success: true, state: state, data: res.json })
      } else {
        return e.json(200, {
          success: false,
          error: `Instância não encontrada. Verifique se o número ${instanceNumber} e o endpoint são válidos.`,
        })
      }
    } catch (err) {
      return e.json(200, {
        success: false,
        error: `Instância não encontrada. Verifique se o número ${instanceNumber} e o endpoint são válidos.`,
      })
    }
  },
  $apis.requireAuth(),
)

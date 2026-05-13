routerAdd(
  'GET',
  '/backend/v1/uazapi/status/{instance}',
  (e) => {
    const instance = e.request.pathValue('instance')
    const domain = 'https://iabrfimveis.uazapi.com'

    const adminToken =
      $secrets.get('UAZAPI_ADMIN_TOKEN') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    try {
      const res = $http.send({
        url: `${domain}/instance/connectionState/${instance}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          AdminToken: adminToken,
        },
        timeout: 15,
      })

      let jsonRes = {}
      try {
        jsonRes = res.json || {}
      } catch (_) {}
      jsonRes.statusCode = res.statusCode

      // Same protection to avoid killing PB sessions by proxying a 401 error code.
      if (res.statusCode === 401 || res.statusCode === 403) {
        return e.json(400, jsonRes)
      }

      if (res.statusCode === 404) {
        jsonRes.error = `Instância não encontrada no Uazapi. Verifique se o número ${instance} está correto no painel da Uazapi.`
        return e.json(400, jsonRes)
      }

      return e.json(res.statusCode === 0 ? 500 : res.statusCode, jsonRes)
    } catch (err) {
      return e.json(500, { error: err.message })
    }
  },
  $apis.requireAuth(),
)

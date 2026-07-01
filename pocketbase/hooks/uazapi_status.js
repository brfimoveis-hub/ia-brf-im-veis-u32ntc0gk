routerAdd(
  'GET',
  '/backend/v1/uazapi/status',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('unauthorized')

    const domain = user.getString('uazapi_domain')
    const token = user.getString('uazapi_admin_token') || user.getString('uazapi_token')
    const instance = user.getString('uazapi_instance_number')

    if (!domain || !token || !instance) {
      return e.badRequestError('Configuração UAZAPI incompleta')
    }

    let baseUrl = domain
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const headers = {
      apikey: token,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    }

    try {
      const res = $http.send({
        url: baseUrl + '/instance/connectionState/' + instance,
        method: 'GET',
        headers: headers,
        timeout: 15,
      })

      let body = {}
      try {
        body = res.json || {}
      } catch (_) {
        body = {}
      }

      if (res.statusCode === 200) {
        let state = 'unknown'

        if (body.instance && body.instance.state) {
          state = body.instance.state
        } else if (body.state) {
          state = body.state
        } else if (body.status) {
          state = body.status
        }

        const normalizedStatus = state === 'open' ? 'connected' : state

        try {
          const dbUser = $app.findRecordById('users', user.id)
          dbUser.set('uazapi_status', normalizedStatus)
          if (state === 'open' || state === 'connected') {
            dbUser.set('uazapi_error', '')
          }
          $app.save(dbUser)
        } catch (dbErr) {
          // Ignore DB errors - status is still returned
        }

        return e.json(200, {
          status: 'success',
          state: state,
          data: body,
        })
      }

      try {
        const dbUser = $app.findRecordById('users', user.id)
        dbUser.set('uazapi_status', 'error')
        dbUser.set(
          'uazapi_error',
          'HTTP ' + res.statusCode + ': ' + (body.message || body.error || 'Unknown error'),
        )
        $app.save(dbUser)
      } catch (dbErr) {
        // Ignore
      }

      return e.json(res.statusCode, {
        status: 'error',
        state: 'error',
        error:
          res.statusCode === 404
            ? 'Instância não encontrada'
            : 'Falha ao verificar status (' + res.statusCode + ')',
        code: res.statusCode,
        data: body,
      })
    } catch (err) {
      try {
        const dbUser = $app.findRecordById('users', user.id)
        dbUser.set('uazapi_status', 'error')
        dbUser.set('uazapi_error', err.message || 'Network error')
        $app.save(dbUser)
      } catch (dbErr) {
        // Ignore
      }

      return e.internalServerError('Erro ao buscar status: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

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

    const logError = (message, details) => {
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'connection_error')
        log.set('message', 'UAZAPI Status: ' + message)
        log.set('details', { instance: instance, ...details })
        log.set('payload', { domain: domain, instance: instance })
        $app.save(log)
      } catch (_) {}
    }

    let baseUrl = domain
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      const msg = 'Domínio inválido. Deve começar com http:// ou https://'
      logError(msg, { domain: domain })
      return e.badRequestError(msg)
    }

    const headers = {
      apikey: token,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    }

    const sendRequest = (url, method) => {
      return $http.send({
        url: url,
        method: method,
        headers: headers,
        timeout: 15,
      })
    }

    try {
      const stateUrl = baseUrl + '/instance/connectionState/' + instance
      let res = sendRequest(stateUrl, 'GET')

      if (res.statusCode === 404) {
        try {
          const fallbackRes = sendRequest(baseUrl + '/instance/status/' + instance, 'GET')
          if (fallbackRes.statusCode !== 404) {
            res = fallbackRes
          }
        } catch (fbErr) {}
      }

      if (res.statusCode === 404) {
        try {
          const altRes = sendRequest(baseUrl + '/instance/fetchInstances', 'GET')
          if (altRes.statusCode >= 200 && altRes.statusCode < 300) {
            let altBody = {}
            try {
              altBody = altRes.json || {}
            } catch (_) {}
            const instances = altBody.instances || altBody.data || []
            if (instances.length > 0) {
              const inst = instances[0]
              const state = inst.state || inst.connectionState || 'unknown'
              const normalizedStatus = state === 'open' ? 'connected' : state
              try {
                const dbUser = $app.findRecordById('users', user.id)
                dbUser.set('uazapi_status', normalizedStatus)
                if (state === 'open' || state === 'connected') {
                  dbUser.set('uazapi_error', '')
                }
                $app.save(dbUser)
              } catch (dbErr) {}
              return e.json(200, {
                status: 'success',
                state: state,
                data: { instance: inst, state: state },
              })
            }
          }
        } catch (altErr) {}
      }

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
        } catch (dbErr) {}

        return e.json(200, {
          status: 'success',
          state: state,
          data: body,
        })
      }

      const errorMsg =
        res.statusCode === 404
          ? 'HTTP 404: Not Found - Instância não encontrada'
          : res.statusCode === 401
            ? 'HTTP 401: Unauthorized - Token inválido'
            : res.statusCode === 405
              ? 'HTTP 405: Method Not Allowed - Método não permitido'
              : 'HTTP ' + res.statusCode + ': Falha ao verificar status'

      try {
        const dbUser = $app.findRecordById('users', user.id)
        dbUser.set('uazapi_status', 'error')
        dbUser.set(
          'uazapi_error',
          'HTTP ' + res.statusCode + ': ' + (body.message || body.error || 'Unknown error'),
        )
        $app.save(dbUser)
      } catch (dbErr) {}

      logError(errorMsg, {
        statusCode: res.statusCode,
        response: body,
      })

      return e.json(res.statusCode, {
        status: 'error',
        state: 'error',
        error: errorMsg,
        code: res.statusCode,
        data: body,
      })
    } catch (err) {
      try {
        const dbUser = $app.findRecordById('users', user.id)
        dbUser.set('uazapi_status', 'error')
        dbUser.set('uazapi_error', err.message || 'Network error')
        $app.save(dbUser)
      } catch (dbErr) {}

      logError(err.message || 'Network error', { error: err.message })

      return e.internalServerError('Erro ao buscar status: ' + err.message)
    }
  },
  $apis.requireAuth(),
)

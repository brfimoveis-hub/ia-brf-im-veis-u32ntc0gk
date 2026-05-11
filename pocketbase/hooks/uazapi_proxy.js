routerAdd(
  'POST',
  '/backend/v1/uazapi/proxy',
  (e) => {
    const body = e.requestInfo().body || {}
    const endpoint = body.endpoint || ''
    const method = body.method || 'GET'
    const payload = body.payload || null
    let domain = body.domain || 'https://iabrfimveis.uazapi.com'
    const apikey = body.apikey || ''

    if (domain.endsWith('/')) domain = domain.slice(0, -1)
    if (domain.endsWith('/api')) domain = domain.slice(0, -4)
    if (domain.endsWith('/v1')) domain = domain.slice(0, -3)

    let url = domain
    if (endpoint.startsWith('/')) {
      url += endpoint
    } else {
      url += '/' + endpoint
    }

    const headers = {
      'Content-Type': 'application/json',
    }
    if (apikey) {
      headers['AdminToken'] = apikey
    }

    const logsCol = $app.findCollectionByNameOrId('system_logs')

    const maxRetries = 3
    let attempt = 0
    let res = null
    let error = null

    const sleep = (ms) => {
      const start = new Date().getTime()
      while (new Date().getTime() - start < ms) {}
    }

    while (attempt <= maxRetries) {
      attempt++
      const startTime = new Date().getTime()
      try {
        res = $http.send({
          url: url,
          method: method,
          headers: headers,
          body: payload ? JSON.stringify(payload) : undefined,
          timeout: 15,
        })

        const duration = new Date().getTime() - startTime

        const logRecord = new Record(logsCol)
        logRecord.set('type', 'uazapi_proxy_attempt')
        logRecord.set('message', `Proxy request attempt ${attempt}`)
        logRecord.set('details', {
          url,
          statusCode: res.statusCode,
          durationMs: duration,
        })
        logRecord.set('payload', {
          request_body: payload,
          response_body: res.json || null,
        })
        $app.saveNoValidate(logRecord)

        if (
          res.statusCode !== 404 &&
          res.statusCode !== 504 &&
          res.statusCode !== 0 &&
          res.statusCode !== 500
        ) {
          break
        }
      } catch (err) {
        error = err
        const duration = new Date().getTime() - startTime
        const logRecord = new Record(logsCol)
        logRecord.set('type', 'uazapi_proxy_error')
        logRecord.set('message', `Proxy request failed attempt ${attempt}`)
        logRecord.set('details', {
          url,
          error: err.message,
          durationMs: duration,
        })
        logRecord.set('payload', { request_body: payload })
        $app.saveNoValidate(logRecord)
      }

      if (
        attempt <= maxRetries &&
        (error ||
          !res ||
          res.statusCode === 404 ||
          res.statusCode === 504 ||
          res.statusCode === 0 ||
          res.statusCode === 500)
      ) {
        const backoff = Math.pow(2, attempt) * 100
        sleep(backoff)
      } else {
        break
      }
    }

    if (!res && error) {
      return e.internalServerError(error.message)
    }

    let jsonRes = {}
    try {
      jsonRes = res.json || {}
    } catch (err) {
      jsonRes = {}
    }

    jsonRes.statusCode = res.statusCode

    return e.json(res.statusCode === 0 ? 500 : res.statusCode, jsonRes)
  },
  $apis.requireAuth(),
)

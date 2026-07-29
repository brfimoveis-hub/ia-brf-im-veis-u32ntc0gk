routerAdd(
  'POST',
  '/backend/v1/diagnostic_lead_forms_webhook',
  (e) => {
    var baseUrl = $secrets.get('PB_INSTANCE_URL') || ''
    if (!baseUrl) {
      baseUrl = 'https://' + (e.request.host || 'localhost')
    }
    var cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

    try {
      var res = $http.send({
        url:
          cleanUrl +
          '/backend/v1/meta-webhook?hub.mode=test&hub.verify_token=test&hub.challenge=test',
        method: 'GET',
        timeout: 10,
      })

      return e.json(200, {
        success: true,
        status_code: res.statusCode,
        message:
          'Endpoint do webhook acessível (HTTP ' +
          res.statusCode +
          '). Endpoint ativo e respondendo.',
      })
    } catch (err) {
      return e.json(200, {
        success: false,
        error: 'Endpoint não acessível: ' + (err.message || 'unknown'),
      })
    }
  },
  $apis.requireAuth(),
)

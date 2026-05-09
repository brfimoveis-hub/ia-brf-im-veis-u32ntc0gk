routerAdd(
  'POST',
  '/backend/v1/ping-sources',
  (e) => {
    let webStatus = 'CONNECTED'
    try {
      const res = $http.send({ url: 'https://www.brfimoveis.com.br/', method: 'GET', timeout: 5 })
      if (res.statusCode >= 400 && res.statusCode !== 403 && res.statusCode !== 401) {
        webStatus = 'DISCONNECTED'
      }
    } catch (err) {
      webStatus = 'DISCONNECTED'
    }

    return e.json(200, {
      website: webStatus,
      youtube: 'CONNECTED',
    })
  },
  $apis.requireAuth(),
)

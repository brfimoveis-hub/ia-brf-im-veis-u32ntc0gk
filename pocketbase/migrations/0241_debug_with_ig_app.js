migrate(
  (app) => {
    const token =
      'EAANEkx5ozUABSiz8wLru6ZAPgO54ZAQc2k0uBUS24JRqsRr2cTtZAchRMCcfoJqQpXoZCaFW5eJTkpRinyeC92Hn4OMkCbUxhIUa5QINtt3LWoXK6jDXI1uVTLyhGvZC2dQJliyUEJtRTCpRNJmgFg8nZBb6FBTF8lnZB2mikWISAcJ8cySzhTVSdGZBY8srdAZDZD'

    const testApp = (appId, appSecret, label) => {
      try {
        const appToken = appId + '|' + appSecret
        const res = $http.send({
          url:
            'https://graph.facebook.com/v22.0/debug_token?input_token=' +
            encodeURIComponent(token) +
            '&access_token=' +
            encodeURIComponent(appToken),
          method: 'GET',
          timeout: 10,
        })
        return { label: label, status: res.statusCode, body: res.json }
      } catch (e) {
        return { label: label, error: String(e) }
      }
    }

    // App Instagram dedicado: 1784416389360167 / e5b607835c4fa925af83ec799b98c3bd
    const igAppRes = testApp(
      '1784416389360167',
      'e5b607835c4fa925af83ec799b98c3bd',
      'instagram_app',
    )

    // Testar com o próprio token como access_token para debug_token:
    let selfDebugRes = null
    try {
      const sRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/debug_token?input_token=' +
          encodeURIComponent(token) +
          '&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 10,
      })
      selfDebugRes = { status: sRes.statusCode, body: sRes.json }
    } catch (eSelf) {
      selfDebugRes = { error: String(eSelf) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(logsCol)
    r.set('user_id', 'g5jto8bhulw01bz')
    r.set('type', 'meta_token_debug_ig_app')
    r.set('message', 'Debug Token with IG App')
    r.set(
      'details',
      JSON.stringify({
        ig_app: igAppRes,
        self_debug: selfDebugRes,
      }),
    )
    app.saveNoValidate(r)
  },
  (app) => {},
)

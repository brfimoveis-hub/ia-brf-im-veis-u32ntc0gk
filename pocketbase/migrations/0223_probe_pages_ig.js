migrate(
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      return
    }
    if (!user) return

    const waToken = user.getString('meta_whatsapp_access_token') || ''
    const capiToken = user.getString('meta_capi_token') || ''

    const probeTokensWithPages = (token, name) => {
      const tests = {}
      const endpoints = [
        '3542548689255402/owned_pages?fields=id,name,access_token,instagram_business_account',
        '3542548689255402/client_pages?fields=id,name,access_token,instagram_business_account',
        '1727871165105009?fields=id,name,primary_page',
        '17841408475954541?fields=id,username,name,ig_id',
      ]

      endpoints.forEach((ep) => {
        try {
          const res = $http.send({
            url:
              'https://graph.facebook.com/v21.0/' +
              ep +
              (ep.includes('?') ? '&' : '?') +
              'access_token=' +
              encodeURIComponent(token),
            method: 'GET',
            timeout: 10,
          })
          tests[ep] = { status: res.statusCode, body: res.json }
        } catch (e) {
          tests[ep] = { error: String(e) }
        }
      })
      return tests
    }

    const waPages = probeTokensWithPages(waToken, 'wa')
    const capiPages = probeTokensWithPages(capiToken, 'capi')

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol)
    rec.set('user_id', user.id)
    rec.set('type', 'api_integration')
    rec.set('message', 'Probe Owned Pages & IG')
    rec.set('details', JSON.stringify({ wa: waPages, capi: capiPages }))
    rec.set('payload', JSON.stringify({ probe: 'pages_ig' }))
    app.saveNoValidate(rec)
  },
  (app) => {},
)

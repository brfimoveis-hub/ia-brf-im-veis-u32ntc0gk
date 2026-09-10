migrate(
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      } catch (e) {
        return
      }
    }
    if (!user) return

    const waToken = user.getString('meta_whatsapp_access_token') || ''
    const capiToken = user.getString('meta_capi_token') || ''
    const igBizId = user.getString('meta_instagram_business_id') || '17841408475954541'
    const appId = user.getString('meta_app_id') || '2442476629610638'
    const appSecret = user.getString('meta_app_secret') || ''
    const appToken = appId + '|' + appSecret

    const testToken = (token, label) => {
      if (!token) return { label: label, empty: true }
      const res = {}
      try {
        const debugRes = $http.send({
          url:
            'https://graph.facebook.com/v21.0/debug_token?input_token=' +
            encodeURIComponent(token) +
            '&access_token=' +
            encodeURIComponent(appToken || token),
          method: 'GET',
          timeout: 10,
        })
        res.debug = { status: debugRes.statusCode, body: debugRes.json }
      } catch (err) {
        res.debug = { error: String(err) }
      }

      try {
        const meRes = $http.send({
          url:
            'https://graph.facebook.com/v21.0/me?fields=id,name&access_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 10,
        })
        res.me = { status: meRes.statusCode, body: meRes.json }
      } catch (err) {
        res.me = { error: String(err) }
      }

      try {
        const accountsRes = $http.send({
          url:
            'https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 10,
        })
        res.accounts = { status: accountsRes.statusCode, body: accountsRes.json }
      } catch (err) {
        res.accounts = { error: String(err) }
      }

      try {
        const igRes = $http.send({
          url:
            'https://graph.facebook.com/v21.0/' +
            igBizId +
            '?fields=id,name,username,profile_picture_url&access_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 10,
        })
        res.ig = { status: igRes.statusCode, body: igRes.json }
      } catch (err) {
        res.ig = { error: String(err) }
      }

      return { label: label, result: res }
    }

    const waTest = testToken(waToken, 'whatsapp_system_user_token')
    const capiTest = testToken(capiToken, 'capi_token')

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol)
    logRec.set('user_id', user.id)
    logRec.set('type', 'api_integration')
    logRec.set('message', 'Probe Instagram & Meta Tokens Diagnostic')
    logRec.set(
      'details',
      JSON.stringify({
        igBizId: igBizId,
        appId: appId,
        waTest: waTest,
        capiTest: capiTest,
      }),
    )
    logRec.set('payload', JSON.stringify({ probe: 'instagram_meta_tokens' }))
    app.saveNoValidate(logRec)
  },
  (app) => {},
)

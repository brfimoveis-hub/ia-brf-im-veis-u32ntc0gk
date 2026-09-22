migrate(
  (app) => {
    const user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
    if (!user) return

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(logsCol)
    r.set('user_id', user.id)
    r.set('type', 'meta_token_probe_0249')
    r.set('message', 'Probe token debug and permissions')

    const userToken = user.getString('meta_instagram_user_token') || ''
    const igAppId = user.getString('meta_instagram_app_id') || '1121822660295492'
    const igAppSecret = user.getString('meta_instagram_app_secret') || ''

    let debugResult = null
    let permsResult = null
    let accountsResult = null
    let meResult = null

    // 1. debug_token via app access token do NOVO app
    if (userToken && igAppId && igAppSecret) {
      try {
        const appToken = igAppId + '|' + igAppSecret
        const dbg = $http.send({
          url:
            'https://graph.facebook.com/v22.0/debug_token?input_token=' +
            encodeURIComponent(userToken) +
            '&access_token=' +
            encodeURIComponent(appToken),
          method: 'GET',
          timeout: 10,
        })
        debugResult = { status: dbg.statusCode, data: dbg.json }
      } catch (e1) {
        debugResult = { error: String(e1) }
      }
    }

    // 2. /me?fields=id,name
    if (userToken) {
      try {
        const me = $http.send({
          url: 'https://graph.facebook.com/v22.0/me?fields=id,name',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + userToken },
          timeout: 10,
        })
        meResult = { status: me.statusCode, data: me.json }
      } catch (e2) {
        meResult = { error: String(e2) }
      }

      // 3. /me/permissions
      try {
        const perms = $http.send({
          url: 'https://graph.facebook.com/v22.0/me/permissions',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + userToken },
          timeout: 10,
        })
        permsResult = { status: perms.statusCode, data: perms.json }
      } catch (e3) {
        permsResult = { error: String(e3) }
      }

      // 4. /me/accounts
      try {
        const accs = $http.send({
          url: 'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,tasks',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + userToken },
          timeout: 10,
        })
        accountsResult = { status: accs.statusCode, data: accs.json }
      } catch (e4) {
        accountsResult = { error: String(e4) }
      }
    }

    r.set(
      'details',
      JSON.stringify({
        debug: debugResult,
        me: meResult,
        permissions: permsResult,
        accounts: accountsResult,
      }),
    )
    app.saveNoValidate(r)
  },
  (app) => {},
)

// Migration 0154: Testa debug_token com o próprio token como access_token e me/permissions
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    const token = user.getString('meta_whatsapp_access_token')

    const logsCol = app.findCollectionByNameOrId('system_logs')

    // 1. debug_token com access_token = token
    let debugSelf = null
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/debug_token?input_token=' +
          encodeURIComponent(token) +
          '&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 15,
      })
      debugSelf = { statusCode: res.statusCode, body: res.json }
    } catch (e) {
      debugSelf = { error: e.message }
    }

    // 2. /v21.0/me/permissions?access_token=token
    let perms = null
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v21.0/me/permissions?access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 15,
      })
      perms = { statusCode: res.statusCode, body: res.json }
    } catch (e) {
      perms = { error: e.message }
    }

    // 3. /v21.0/me?access_token=token&fields=id,name
    let me = null
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v21.0/me?fields=id,name&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 15,
      })
      me = { statusCode: res.statusCode, body: res.json }
    } catch (e) {
      me = { error: e.message }
    }

    const log1 = new Record(logsCol)
    log1.set('type', 'whatsapp_diag_self_debug')
    log1.set(
      'message',
      'Self debug: ' +
        (debugSelf.body && debugSelf.body.data
          ? JSON.stringify(debugSelf.body.data)
          : JSON.stringify(debugSelf.body || debugSelf)),
    )
    log1.set('user_id', user.id)
    log1.set('details', JSON.stringify({ debug_self: debugSelf, perms: perms, me: me }))
    app.save(log1)
  },
  (app) => {},
)

// Migration 1760000117: Testar debug_token com o token do Instagram App / User Token
migrate(
  (app) => {
    const user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    if (!user) return

    const pageToken = user.getString('meta_page_access_token')
    const igAppId = user.getString('meta_instagram_app_id') || '2442476629610638'
    const igAppSecret = user.getString('meta_instagram_app_secret')
    const igAppToken = `${igAppId}|${igAppSecret}`

    const debugRes = $http.send({
      url: `https://graph.facebook.com/v22.0/debug_token?input_token=${encodeURIComponent(pageToken)}&access_token=${encodeURIComponent(igAppToken)}`,
      method: 'GET',
      timeout: 15,
    })

    const sysLogsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(sysLogsCol, {
      user_id: user.id,
      type: 'messenger_token_debug_ig_app',
      message: 'Debug com igAppToken secret',
      details: JSON.stringify(debugRes.json || debugRes.body || {}),
    })
    app.save(r)
  },
  (app) => {},
)

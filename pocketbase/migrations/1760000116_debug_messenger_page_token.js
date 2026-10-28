// Migration 1760000116: Testar debug_token e permissões do page token da página 1343797128806374
migrate(
  (app) => {
    const user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    if (!user) return

    const pageToken = user.getString('meta_page_access_token')
    const appId = user.getString('meta_app_id') || '2442476629610638'
    const appSecret = user.getString('meta_app_secret') || 'd085b85d8d534c682f60b6bde8043610'
    const appToken = `${appId}|${appSecret}`

    const debugRes = $http.send({
      url: `https://graph.facebook.com/v22.0/debug_token?input_token=${encodeURIComponent(pageToken)}&access_token=${encodeURIComponent(appToken)}`,
      method: 'GET',
      timeout: 15,
    })

    const sysLogsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(sysLogsCol, {
      user_id: user.id,
      type: 'messenger_token_debug',
      message: 'Debug do Page Access Token da Página BRF Imóveis',
      details: JSON.stringify(debugRes.json || debugRes.body || {}),
    })
    app.save(r)
  },
  (app) => {},
)

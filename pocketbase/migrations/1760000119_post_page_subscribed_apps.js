// Migration 1760000119: Fazer POST /{pageId}/subscribed_apps usando o Page Access Token e verificar retorno
migrate(
  (app) => {
    const pageId = '1343797128806374'
    const user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    if (!user) return

    const pageToken = user.getString('meta_page_access_token')

    // Executar POST /{pageId}/subscribed_apps
    const postRes = $http.send({
      url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `subscribed_fields=messages,messaging_postbacks,messaging_optins&access_token=${encodeURIComponent(pageToken)}`,
      timeout: 15,
    })

    const sysLogsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(sysLogsCol, {
      user_id: user.id,
      type: 'messenger_page_subscribed_result',
      message: `POST /${pageId}/subscribed_apps status: ${postRes.statusCode}`,
      details: JSON.stringify(postRes.json || postRes.body || {}),
    })
    app.save(r)
  },
  (app) => {},
)

// Migration 1760000121: Testar GET subscribed_apps com User Token
migrate(
  (app) => {
    const pageId = '1343797128806374'
    const user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    if (!user) return

    const userToken = user.getString('meta_instagram_user_token')

    const getRes = $http.send({
      url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(userToken)}`,
      method: 'GET',
      timeout: 15,
    })

    const sysLogsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(sysLogsCol, {
      user_id: user.id,
      type: 'messenger_user_token_subscribed_get',
      message: `GET /${pageId}/subscribed_apps com userToken status: ${getRes.statusCode}`,
      details: JSON.stringify(getRes.json || getRes.body || {}),
    })
    app.save(r)
  },
  (app) => {},
)

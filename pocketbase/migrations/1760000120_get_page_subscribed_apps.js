// Migration 1760000120: GET /1343797128806374/subscribed_apps com Page Token
migrate(
  (app) => {
    const pageId = '1343797128806374'
    const user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    if (!user) return

    const pageToken = user.getString('meta_page_access_token')

    const getRes = $http.send({
      url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageToken)}`,
      method: 'GET',
      timeout: 15,
    })

    const sysLogsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(sysLogsCol, {
      user_id: user.id,
      type: 'messenger_page_subscribed_get',
      message: `GET /${pageId}/subscribed_apps status: ${getRes.statusCode}`,
      details: JSON.stringify(getRes.json || getRes.body || {}),
    })
    app.save(r)
  },
  (app) => {},
)

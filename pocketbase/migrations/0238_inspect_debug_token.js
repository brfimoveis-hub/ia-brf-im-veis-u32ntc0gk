migrate(
  (app) => {
    const token =
      'EAANEkx5ozUABSiz8wLru6ZAPgO54ZAQc2k0uBUS24JRqsRr2cTtZAchRMCcfoJqQpXoZCaFW5eJTkpRinyeC92Hn4OMkCbUxhIUa5QINtt3LWoXK6jDXI1uVTLyhGvZC2dQJliyUEJtRTCpRNJmgFg8nZBb6FBTF8lnZB2mikWISAcJ8cySzhTVSdGZBY8srdAZDZD'
    const appId = '2442476629610638'
    const appSecret = 'd085b85d8d534c682f60b6bde8043610'
    const appToken = appId + '|' + appSecret

    let debugData = null
    try {
      const debugRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/debug_token?input_token=' +
          encodeURIComponent(token) +
          '&access_token=' +
          encodeURIComponent(appToken),
        method: 'GET',
        timeout: 10,
      })
      debugData = { status: debugRes.statusCode, data: debugRes.json }
    } catch (eDebug) {
      debugData = { error: String(eDebug) }
    }

    const lastLog = app.findFirstRecordByData('system_logs', 'id', 'mlrugxodyk9mror')
    let errMsg = ''
    if (lastLog) {
      try {
        const d = JSON.parse(lastLog.getString('details') || '{}')
        if (d.direct_target_page && d.direct_target_page.data && d.direct_target_page.data.error) {
          errMsg = d.direct_target_page.data.error.message || ''
        }
      } catch (_) {}
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(logsCol)
    r.set('user_id', 'g5jto8bhulw01bz')
    r.set('type', 'meta_token_debug_info')
    r.set('message', 'Debug Token Info & Target Error')
    r.set(
      'details',
      JSON.stringify({
        target_page_err_message: errMsg,
        debug_token: debugData,
      }),
    )
    app.saveNoValidate(r)
  },
  (app) => {},
)

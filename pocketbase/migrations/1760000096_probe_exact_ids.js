migrate(
  (app) => {
    let user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {}
    if (!user) return

    const userTok = user.getString('meta_instagram_user_token') || ''
    const results = {}

    // 1. Testa GET /17841418593400936?fields=id,username,name
    try {
      const res1 = $http.send({
        url:
          'https://graph.facebook.com/v22.0/17841418593400936?fields=id,username,name&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 10,
      })
      results.ig_17841418593400936 = { status: res1.statusCode, json: res1.json }
    } catch (e1) {
      results.ig_17841418593400936 = { error: String(e1) }
    }

    // 2. Consulta a página oficial 1219427617930954 diretamente via /1219427617930954?fields=id,name,instagram_business_account{id,username,name}
    try {
      const resPage1 = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1219427617930954?fields=id,name,instagram_business_account{id,username,name}&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 10,
      })
      results.page_1219427617930954 = { status: resPage1.statusCode, json: resPage1.json }
    } catch (e2) {
      results.page_1219427617930954 = { error: String(e2) }
    }

    // 3. Consulta a página 1343797128806374 (que retornou em /me/accounts)
    try {
      const resPage2 = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 10,
      })
      results.page_1343797128806374 = { status: resPage2.statusCode, json: resPage2.json }
    } catch (e3) {
      results.page_1343797128806374 = { error: String(e3) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'probe_exact_id_check',
      message: 'Probe Exact IDs ' + JSON.stringify(results).slice(0, 150),
      details: JSON.stringify(results),
      payload: results,
      user_id: user.id,
    })
    app.save(logRec)
  },
  (app) => {},
)

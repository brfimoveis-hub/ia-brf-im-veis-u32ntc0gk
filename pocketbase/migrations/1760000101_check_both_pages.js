migrate(
  (app) => {
    let user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {}
    if (!user) return

    const userTok = user.getString('meta_instagram_user_token') || ''
    const results = {}

    // Testa GET /1219427617930954 com userTok sem fields restritos
    try {
      const r1 = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1219427617930954?access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 8,
      })
      results.r1 = { status: r1.statusCode, json: r1.json }
    } catch (e1) {
      results.r1 = { error: String(e1) }
    }

    // Testa GET /1343797128806374?fields=id,name,instagram_business_account{id,username}
    try {
      const r2 = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374?fields=id,name,instagram_business_account{id,username}&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 8,
      })
      results.r2 = { status: r2.statusCode, json: r2.json }
    } catch (e2) {
      results.r2 = { error: String(e2) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol, {
      type: 'probe_slice_pcheck',
      message: 'Pcheck',
      details: JSON.stringify(results),
      user_id: user.id,
    })
    app.save(rec)
  },
  (app) => {},
)

migrate(
  (app) => {
    const users = app.findRecordsByFilter(
      'users',
      'email = "brfimoveis@gmail.com"',
      '-created',
      1,
      0,
    )
    if (!users || users.length === 0) return
    const user = users[0]
    const userTok = user.getString('meta_instagram_user_token') || ''
    const pageTok = user.getString('meta_instagram_page_token') || ''
    const candId = '17841430026178145'

    // Testa vários fields no candId
    let tests = {}
    const fieldsToTest = [
      'id,username,name',
      'id,ig_id,username,name',
      'id,name',
      'id,username',
      'id,media_count,followers_count',
    ]

    for (let i = 0; i < fieldsToTest.length; i++) {
      const f = fieldsToTest[i]
      try {
        const res = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            candId +
            '?fields=' +
            f +
            '&access_token=' +
            encodeURIComponent(pageTok),
          method: 'GET',
          timeout: 10,
        })
        tests['field_' + f] = { status: res.statusCode, json: res.json }
      } catch (e) {
        tests['field_' + f] = { error: String(e) }
      }
    }

    // Também testa na página BRF Imóveis se há connected_instagram_account
    try {
      const connRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374/connected_instagram_account?access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      tests['page_connected_instagram_account'] = { status: connRes.statusCode, json: connRes.json }
    } catch (eConn) {
      tests['page_connected_instagram_account'] = { error: String(eConn) }
    }

    // Também testa na página BRF Imóveis se há instagram_accounts
    try {
      const accRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374/instagram_accounts?fields=id,username,name&access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      tests['page_instagram_accounts'] = { status: accRes.statusCode, json: accRes.json }
    } catch (eAcc) {
      tests['page_instagram_accounts'] = { error: String(eAcc) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_cand_fields',
      message: 'Probe Cand Fields',
      payload: tests,
      details: JSON.stringify(tests).substring(0, 500),
    })
    app.save(logRec)
  },
  (app) => {},
)

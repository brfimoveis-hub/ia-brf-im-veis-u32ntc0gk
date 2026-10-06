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
    const pageTok = user.getString('meta_instagram_page_token') || ''

    let subtests = {}
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374/page_backed_instagram_accounts?fields=id,username,name,profile_pic&access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      subtests['page_backed_with_fields'] = res.json
    } catch (e1) {
      subtests['page_backed_with_fields'] = { error: String(e1) }
    }

    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374/instagram_accounts?access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      subtests['instagram_accounts_res'] = res.json
    } catch (e2) {
      subtests['instagram_accounts_res'] = { error: String(e2) }
    }

    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374/connected_instagram_account?access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      subtests['connected_instagram_account_res'] = res.json
    } catch (e3) {
      subtests['connected_instagram_account_res'] = { error: String(e3) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_subtests',
      message: 'Probe Subtests',
      payload: subtests,
      details: JSON.stringify(subtests).substring(0, 500),
    })
    app.save(logRec)
  },
  (app) => {},
)

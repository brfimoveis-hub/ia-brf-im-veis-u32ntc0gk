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
    const userTok = user.getString('meta_instagram_user_token') || ''

    let tests = {}

    // 1. Testa GET /{id} na conta 17841430026178145 para ver se funciona como nó de Instagram
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/17841430026178145?access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      tests['pb_node_with_page_token'] = res.json
    } catch (e1) {
      tests['pb_node_with_page_token'] = { error: String(e1) }
    }

    // 2. Testa se a conta 17841430026178145 responde na borda /media ou /tags
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/17841430026178145/media?access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      tests['pb_media'] = res.json
    } catch (e2) {
      tests['pb_media'] = { error: String(e2) }
    }

    // 3. Testa se existe instagram_user ou instagram_business_account em /me/accounts da Bernadete
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me?fields=id,name,accounts{id,name,instagram_business_account{id,username},connected_instagram_account{id,username}}&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 10,
      })
      tests['me_accounts_deep'] = res.json
    } catch (e3) {
      tests['me_accounts_deep'] = { error: String(e3) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_pb_node',
      message: 'Probe PB Node',
      payload: tests,
      details: JSON.stringify(tests).substring(0, 500),
    })
    app.save(logRec)
  },
  (app) => {},
)

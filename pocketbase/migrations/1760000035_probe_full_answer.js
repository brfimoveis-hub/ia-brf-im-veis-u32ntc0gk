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

    let p1Res = null
    let p2Res = null

    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374?fields=id,name,category,is_published,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      p1Res = res.json
    } catch (e1) {
      p1Res = { error: String(e1) }
    }

    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1524869344310722?fields=id,name,category,is_published,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 10,
      })
      p2Res = res.json
    } catch (e2) {
      p2Res = { error: String(e2) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_full_answer',
      message: 'Probe Full Answer',
      payload: {
        p1_brf_imoveis: p1Res,
        p2_bernadete: p2Res,
      },
      details: 'p1=' + JSON.stringify(p1Res) + ' | p2=' + JSON.stringify(p2Res),
    })
    app.save(logRec)
  },
  (app) => {},
)

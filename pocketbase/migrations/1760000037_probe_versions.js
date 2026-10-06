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

    // Testa versões de v21.0 a v17.0
    const versions = ['v21.0', 'v20.0', 'v19.0', 'v18.0']
    for (let i = 0; i < versions.length; i++) {
      const v = versions[i]
      try {
        const res = $http.send({
          url:
            'https://graph.facebook.com/' +
            v +
            '/1343797128806374?fields=instagram_business_account,connected_instagram_account&access_token=' +
            encodeURIComponent(pageTok),
          method: 'GET',
          timeout: 8,
        })
        tests['page_' + v] = res.json
      } catch (e) {
        tests['page_' + v] = { error: String(e) }
      }
    }

    // Testa /me com userTok para saber quem autorizou (ID do usuário do Facebook)
    try {
      const meRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me?fields=id,name,email&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 8,
      })
      tests['user_identity'] = meRes.json
    } catch (meErr) {
      tests['user_identity'] = { error: String(meErr) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_versions',
      message: 'Probe Versions and Identity',
      payload: tests,
      details: JSON.stringify(tests).substring(0, 500),
    })
    app.save(logRec)
  },
  (app) => {},
)

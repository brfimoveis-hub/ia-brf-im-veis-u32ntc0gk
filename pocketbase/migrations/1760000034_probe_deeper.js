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
    const sysTok = user.getString('meta_whatsapp_access_token') || ''

    let tests = {}

    // 1. Testa edge instagram_accounts
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374/instagram_accounts?access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      tests['instagram_accounts'] = res.json
    } catch (e1) {
      tests['instagram_accounts'] = { error: String(e1) }
    }

    // 2. Testa edge page_backed_instagram_accounts sem campos inválidos
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374/page_backed_instagram_accounts?fields=id,username&access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      tests['page_backed_username'] = res.json
    } catch (e2) {
      tests['page_backed_username'] = { error: String(e2) }
    }

    // 3. Testa com sysTok ou userTok na página da imobiliária
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374?fields=instagram_business_account{id,username,name}&access_token=' +
          encodeURIComponent(sysTok || userTok),
        method: 'GET',
        timeout: 10,
      })
      tests['sysTok_page_ig'] = res.json
    } catch (e3) {
      tests['sysTok_page_ig'] = { error: String(e3) }
    }

    // 4. Inspeciona a página 1219427617930954 citada na memória do projeto ("Página BRF Imóveis 1219427617930954")
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1219427617930954?fields=id,name,instagram_business_account{id,username,name}&access_token=' +
          encodeURIComponent(sysTok || pageTok || userTok),
        method: 'GET',
        timeout: 10,
      })
      tests['page_1219427617930954'] = res.json
    } catch (e4) {
      tests['page_1219427617930954'] = { error: String(e4) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_deeper',
      message: 'Probe Deeper',
      payload: tests,
      details: JSON.stringify(tests).substring(0, 500),
    })
    app.save(logRec)
  },
  (app) => {},
)

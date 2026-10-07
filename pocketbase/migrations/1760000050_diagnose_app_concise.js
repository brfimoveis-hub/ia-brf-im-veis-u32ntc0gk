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
    const appId = (user.getString('meta_instagram_app_id') || '2442476629610638').trim()
    const appSecret = (user.getString('meta_instagram_app_secret') || '').trim()
    const oauthUserTok = (user.getString('meta_instagram_user_token') || '').trim()
    const appToken = appId && appSecret ? appId + '|' + appSecret : ''

    const report = {}

    // A) GET App Info com campos válidos na Graph API v22.0
    // Campos válidos comuns em /<app_id>: id, name, category, link, server_ip_whitelist, privacy_policy_url
    if (appToken) {
      try {
        const resA = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '?fields=id,name,category,link,privacy_policy_url&access_token=' +
            encodeURIComponent(appToken),
          method: 'GET',
          timeout: 10,
        })
        report.app_fields = { status: resA.statusCode, body: resA.json }
      } catch (eA) {
        report.app_fields = { error: String(eA) }
      }

      // App roles com app token
      try {
        const resR1 = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '/roles?access_token=' +
            encodeURIComponent(appToken),
          method: 'GET',
          timeout: 10,
        })
        report.roles_app_tok = { status: resR1.statusCode, body: resR1.json }
      } catch (eR1) {
        report.roles_app_tok = { error: String(eR1) }
      }
    }

    // B) Roles e User com User Token do Mauro
    if (oauthUserTok) {
      try {
        const resMe = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me?fields=id,name&access_token=' +
            encodeURIComponent(oauthUserTok),
          method: 'GET',
          timeout: 10,
        })
        report.mauro_me = { status: resMe.statusCode, body: resMe.json }
      } catch (eM) {
        report.mauro_me = { error: String(eM) }
      }

      try {
        const resR2 = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '/roles?access_token=' +
            encodeURIComponent(oauthUserTok),
          method: 'GET',
          timeout: 10,
        })
        report.roles_mauro_tok = { status: resR2.statusCode, body: resR2.json }
      } catch (eR2) {
        report.roles_mauro_tok = { error: String(eR2) }
      }

      // C) Debug do próprio app token ou user token via debug_token
      try {
        const resDbg = $http.send({
          url:
            'https://graph.facebook.com/v22.0/debug_token?input_token=' +
            encodeURIComponent(oauthUserTok) +
            '&access_token=' +
            encodeURIComponent(appToken || oauthUserTok),
          method: 'GET',
          timeout: 10,
        })
        report.debug_token = { status: resDbg.statusCode, body: resDbg.json }
      } catch (eDbg) {
        report.debug_token = { error: String(eDbg) }
      }
    }

    // D) Teste ID Bernadete: 100053924061859
    try {
      const resB = $http.send({
        url:
          'https://graph.facebook.com/v22.0/100053924061859?fields=id,name&access_token=' +
          encodeURIComponent(appToken || oauthUserTok),
        method: 'GET',
        timeout: 10,
      })
      report.bernadete_probe = { status: resB.statusCode, body: resB.json }
    } catch (eB) {
      report.bernadete_probe = { error: String(eB) }
    }

    // E) Teste POST /roles com user token e app token usando query param / form URL encoded
    // Meta /roles POST aceita: POST /<app_id>/roles?user=<user_id>&role=testers
    if (oauthUserTok) {
      try {
        const resPostUser = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '/roles?user=100053924061859&role=testers&access_token=' +
            encodeURIComponent(oauthUserTok),
          method: 'POST',
          timeout: 10,
        })
        report.post_role_mauro = { status: resPostUser.statusCode, body: resPostUser.json }
      } catch (ePU) {
        report.post_role_mauro = { error: String(ePU) }
      }
    }

    if (appToken) {
      try {
        const resPostApp = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '/roles?user=100053924061859&role=testers&access_token=' +
            encodeURIComponent(appToken),
          method: 'POST',
          timeout: 10,
        })
        report.post_role_app = { status: resPostApp.statusCode, body: resPostApp.json }
      } catch (ePA) {
        report.post_role_app = { error: String(ePA) }
      }
    }

    // Salva em um único registro claro
    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol, {
      type: 'meta_inspect_concise',
      message: 'DIAG_CONCISE',
      details: JSON.stringify(report),
      user_id: user.id,
    })
    app.save(rec)

    console.log('[INSTAGRAM_APP_STATUS] app_fields: ' + JSON.stringify(report.app_fields))
    console.log('[INSTAGRAM_APP_STATUS] roles_app_tok: ' + JSON.stringify(report.roles_app_tok))
    console.log('[INSTAGRAM_APP_STATUS] mauro_me: ' + JSON.stringify(report.mauro_me))
    console.log('[INSTAGRAM_APP_STATUS] roles_mauro_tok: ' + JSON.stringify(report.roles_mauro_tok))
    console.log('[INSTAGRAM_APP_STATUS] debug_token: ' + JSON.stringify(report.debug_token))
    console.log('[INSTAGRAM_APP_STATUS] bernadete_probe: ' + JSON.stringify(report.bernadete_probe))
    console.log('[INSTAGRAM_APP_STATUS] post_role_mauro: ' + JSON.stringify(report.post_role_mauro))
    console.log('[INSTAGRAM_APP_STATUS] post_role_app: ' + JSON.stringify(report.post_role_app))
  },
  (app) => {},
)

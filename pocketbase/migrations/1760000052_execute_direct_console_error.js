migrate(
  (app) => {
    // Busca usuário brfimoveis@gmail.com
    const users = app.findRecordsByFilter(
      'users',
      'email = "brfimoveis@gmail.com"',
      '-created',
      1,
      0,
    )
    if (!users || users.length === 0) return
    const user = users[0]

    // Gera token de autenticação de superuser ou user para chamar a rota
    // Ou simplesmente chama a lógica de diagnóstico diretamente aqui dentro da migration e grava nos logs do servidor console.error / console.warn
    console.error('[INSTAGRAM_APP_STATUS] TRIGGERING_APP_DIAGNOSTIC_DIRECTLY')

    const appId = '2442476629610638'
    const appSecret = (user.getString('meta_instagram_app_secret') || '').trim()
    const oauthUserTok = (user.getString('meta_instagram_user_token') || '').trim()
    const appToken = appId + '|' + appSecret

    // 1. App fields
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          appId +
          '?fields=id,name,category,link&access_token=' +
          encodeURIComponent(appToken),
        method: 'GET',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 1. APP_GET: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e1) {
      console.error('[INSTAGRAM_APP_STATUS] 1. APP_GET ERROR: ' + String(e1))
    }

    // 2. Roles com App Token
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          appId +
          '/roles?access_token=' +
          encodeURIComponent(appToken),
        method: 'GET',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 2. ROLES_APP_TOK: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e2) {
      console.error('[INSTAGRAM_APP_STATUS] 2. ROLES_APP_TOK ERROR: ' + String(e2))
    }

    // 3. Me Mauro com oauthUserTok
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me?fields=id,name&access_token=' +
          encodeURIComponent(oauthUserTok),
        method: 'GET',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 3. MAURO_ME: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e3) {
      console.error('[INSTAGRAM_APP_STATUS] 3. MAURO_ME ERROR: ' + String(e3))
    }

    // 4. Roles com Mauro Token
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          appId +
          '/roles?access_token=' +
          encodeURIComponent(oauthUserTok),
        method: 'GET',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 4. ROLES_MAURO: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e4) {
      console.error('[INSTAGRAM_APP_STATUS] 4. ROLES_MAURO ERROR: ' + String(e4))
    }

    // 5. Debug Token do Mauro
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/debug_token?input_token=' +
          encodeURIComponent(oauthUserTok) +
          '&access_token=' +
          encodeURIComponent(appToken),
        method: 'GET',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 5. DEBUG_TOKEN: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e5) {
      console.error('[INSTAGRAM_APP_STATUS] 5. DEBUG_TOKEN ERROR: ' + String(e5))
    }

    // 6. Bernadete Profile check
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/100053924061859?fields=id,name&access_token=' +
          encodeURIComponent(appToken),
        method: 'GET',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 6. BERNADETE_APP_TOK: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e6) {
      console.error('[INSTAGRAM_APP_STATUS] 6. BERNADETE_APP_TOK ERROR: ' + String(e6))
    }

    // 7. POST Role Testers com User Token Mauro
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          appId +
          '/roles?user=100053924061859&role=testers&access_token=' +
          encodeURIComponent(oauthUserTok),
        method: 'POST',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 7. POST_ROLE_MAURO: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e7) {
      console.error('[INSTAGRAM_APP_STATUS] 7. POST_ROLE_MAURO ERROR: ' + String(e7))
    }

    // 8. POST Role Testers com App Token
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          appId +
          '/roles?user=100053924061859&role=testers&access_token=' +
          encodeURIComponent(appToken),
        method: 'POST',
        timeout: 10,
      })
      console.error(
        '[INSTAGRAM_APP_STATUS] 8. POST_ROLE_APP_TOK: status=' +
          res.statusCode +
          ' data=' +
          JSON.stringify(res.json),
      )
    } catch (e8) {
      console.error('[INSTAGRAM_APP_STATUS] 8. POST_ROLE_APP_TOK ERROR: ' + String(e8))
    }
  },
  (app) => {},
)

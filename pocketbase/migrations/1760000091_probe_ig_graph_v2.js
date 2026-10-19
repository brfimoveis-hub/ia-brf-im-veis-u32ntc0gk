migrate(
  (app) => {
    let user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {}
    if (!user) return

    const userTok = user.getString('meta_instagram_user_token') || ''
    const pageTok = user.getString('meta_instagram_page_token') || ''
    const tokens = []
    if (userTok) tokens.push({ type: 'user_token', tok: userTok })
    if (pageTok && pageTok !== userTok) tokens.push({ type: 'page_token', tok: pageTok })

    const results = {}

    for (let i = 0; i < tokens.length; i++) {
      const item = tokens[i]
      const tok = item.tok

      // 1. GET /me?fields=id,name,username
      try {
        const resMe = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me?fields=id,name,username&access_token=' +
            encodeURIComponent(tok),
          method: 'GET',
          timeout: 10,
        })
        results[item.type + '_me'] = { status: resMe.statusCode, json: resMe.json }
      } catch (e1) {
        results[item.type + '_me'] = { error: String(e1) }
      }

      // 2. GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}
      try {
        const resAcc = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=' +
            encodeURIComponent(tok),
          method: 'GET',
          timeout: 10,
        })
        results[item.type + '_accounts'] = { status: resAcc.statusCode, json: resAcc.json }
      } catch (e2) {
        results[item.type + '_accounts'] = { error: String(e2) }
      }

      // 3. GET /1219427617930954?fields=id,name,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}
      try {
        const resPage = $http.send({
          url:
            'https://graph.facebook.com/v22.0/1219427617930954?fields=id,name,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=' +
            encodeURIComponent(tok),
          method: 'GET',
          timeout: 10,
        })
        results[item.type + '_official_page'] = { status: resPage.statusCode, json: resPage.json }
      } catch (e3) {
        results[item.type + '_official_page'] = { error: String(e3) }
      }

      // 4. GET /17841418953400936?fields=id,username,name
      try {
        const resIgReal = $http.send({
          url:
            'https://graph.facebook.com/v22.0/17841418953400936?fields=id,username,name&access_token=' +
            encodeURIComponent(tok),
          method: 'GET',
          timeout: 10,
        })
        results[item.type + '_ig_17841418953400936'] = {
          status: resIgReal.statusCode,
          json: resIgReal.json,
        }
      } catch (e4) {
        results[item.type + '_ig_17841418953400936'] = { error: String(e4) }
      }

      // 5. GET /17841403502427937?fields=id,username,name
      try {
        const resIgOld = $http.send({
          url:
            'https://graph.facebook.com/v22.0/17841403502427937?fields=id,username,name&access_token=' +
            encodeURIComponent(tok),
          method: 'GET',
          timeout: 10,
        })
        results[item.type + '_ig_17841403502427937'] = {
          status: resIgOld.statusCode,
          json: resIgOld.json,
        }
      } catch (e5) {
        results[item.type + '_ig_17841403502427937'] = { error: String(e5) }
      }
    }

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const rec = new Record(logsCol, {
        type: 'probe_ig_graph_v2',
        message: 'Graph API Probe for Mauro Instagram Business',
        payload: results,
        details: JSON.stringify(results),
        user_id: user.id,
      })
      app.save(rec)
    } catch (errLog) {
      console.log('Error saving probe log: ' + String(errLog))
    }
  },
  (app) => {},
)

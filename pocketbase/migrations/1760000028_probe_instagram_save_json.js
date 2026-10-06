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
    const pageTok =
      user.getString('meta_instagram_page_token') || user.getString('meta_page_access_token') || ''
    const userTok = user.getString('meta_instagram_user_token') || ''

    let pageInspection = null
    let meAccountsInspection = null

    if (pageTok) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v22.0/me?fields=id,name,instagram_business_account{id,username,name}',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + pageTok },
          timeout: 15,
        })
        pageInspection = { status: res.statusCode, json: res.json }
      } catch (e1) {
        pageInspection = { error: String(e1) }
      }
    }

    if (userTok) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=50',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + userTok },
          timeout: 15,
        })
        meAccountsInspection = { status: res.statusCode, json: res.json }
      } catch (e2) {
        meAccountsInspection = { error: String(e2) }
      }
    }

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol, {
        type: 'meta_probe',
        message: 'Probe Instagram Business ID',
        payload: {
          page_inspection: pageInspection,
          me_accounts_inspection: meAccountsInspection,
          timestamp: new Date().toISOString(),
        },
        details: JSON.stringify({
          page_inspection: pageInspection,
          me_accounts_inspection: meAccountsInspection,
        }),
      })
      app.save(logRec)
    } catch (logErr) {
      console.log('[PROBE_PAGE] Falha ao salvar em system_logs: ' + String(logErr))
    }
  },
  (app) => {},
)

migrate(
  (app) => {
    const users = app.findRecordsByFilter(
      'users',
      'email = "brfimoveis@gmail.com"',
      '-created',
      1,
      0,
    )
    if (!users || users.length === 0) {
      console.log('[PROBE_PAGE] Usuário brfimoveis@gmail.com não encontrado')
      return
    }
    const user = users[0]
    const pageTok =
      user.getString('meta_instagram_page_token') || user.getString('meta_page_access_token') || ''
    const userTok = user.getString('meta_instagram_user_token') || ''

    console.log('[PROBE_PAGE] Inspecionando tokens para brfimoveis@gmail.com:')
    console.log('[PROBE_PAGE] has_page_token=' + !!pageTok + ', has_user_token=' + !!userTok)

    let pageInspection = null
    let meAccountsInspection = null

    // 1. Testa a chamada direta à página com o page token via /me (já que o page token representa a Página)
    if (pageTok) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v22.0/me?fields=id,name,instagram_business_account{id,username,name}',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + pageTok },
          timeout: 15,
        })
        pageInspection = {
          status: res.statusCode,
          json: res.json,
        }
        console.log(
          '[PROBE_PAGE] /me com pageToken: status=' +
            res.statusCode +
            ' data=' +
            JSON.stringify(res.json),
        )
      } catch (e1) {
        console.log('[PROBE_PAGE] erro /me com pageToken: ' + String(e1))
        pageInspection = { error: String(e1) }
      }
    }

    // 2. Testa com o userTok em /me/accounts para ver todas as páginas e seus instagram_business_account
    if (userTok) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=50',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + userTok },
          timeout: 15,
        })
        meAccountsInspection = {
          status: res.statusCode,
          json: res.json,
        }
        console.log(
          '[PROBE_PAGE] /me/accounts com userTok: status=' +
            res.statusCode +
            ' data=' +
            JSON.stringify(res.json),
        )
      } catch (e2) {
        console.log('[PROBE_PAGE] erro /me/accounts com userTok: ' + String(e2))
        meAccountsInspection = { error: String(e2) }
      }
    }

    // Grava em um log no system_logs para termos inspeção completa e estruturada
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol, {
        type: 'meta_probe',
        status: 'info',
        message: 'Probe Instagram Business ID',
        details: {
          page_inspection: pageInspection,
          me_accounts_inspection: meAccountsInspection,
          timestamp: new Date().toISOString(),
        },
      })
      app.save(logRec)
    } catch (logErr) {
      console.log('[PROBE_PAGE] Falha ao salvar em system_logs: ' + String(logErr))
    }
  },
  (app) => {},
)

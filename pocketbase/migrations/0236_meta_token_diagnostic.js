migrate(
  (app) => {
    const token =
      'EAANEkx5ozUABSiz8wLru6ZAPgO54ZAQc2k0uBUS24JRqsRr2cTtZAchRMCcfoJqQpXoZCaFW5eJTkpRinyeC92Hn4OMkCbUxhIUa5QINtt3LWoXK6jDXI1uVTLyhGvZC2dQJliyUEJtRTCpRNJmgFg8nZBb6FBTF8lnZB2mikWISAcJ8cySzhTVSdGZBY8srdAZDZD'
    const masked = '...' + token.slice(-4)

    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      } catch (e) {
        return
      }
    }
    if (!user) return

    const probeResult = {
      token_suffix: masked,
      timestamp: new Date().toISOString(),
      me: null,
      accounts: null,
      permissions: null,
      direct_target_page: null,
      saved_changes: {},
    }

    // 1. GET /me?fields=id,name,email
    try {
      const meRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me?fields=id,name,email&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 15,
      })
      probeResult.me = { status: meRes.statusCode, data: meRes.json || meRes.raw }
    } catch (eMe) {
      probeResult.me = { error: String(eMe) }
    }

    // 2. GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100
    let targetPageFound = false
    let targetPageToken = ''
    let targetIgAccount = null

    try {
      const accRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 20,
      })
      probeResult.accounts = { status: accRes.statusCode, data: accRes.json || accRes.raw }

      if (
        accRes.statusCode >= 200 &&
        accRes.statusCode < 300 &&
        accRes.json &&
        Array.isArray(accRes.json.data)
      ) {
        const pages = accRes.json.data
        for (let i = 0; i < pages.length; i++) {
          const p = pages[i]
          const pId = String(p.id || '').trim()
          let igAcc = p.instagram_business_account || null

          if (!igAcc && pId) {
            try {
              const dpRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/' +
                  encodeURIComponent(pId) +
                  '?fields=instagram_business_account{id,username,name}&access_token=' +
                  encodeURIComponent(p.access_token || token),
                method: 'GET',
                timeout: 8,
              })
              if (dpRes.statusCode === 200 && dpRes.json && dpRes.json.instagram_business_account) {
                igAcc = dpRes.json.instagram_business_account
                p.instagram_business_account = igAcc
              }
            } catch (_) {}
          }

          if (pId === '1343797128806374') {
            targetPageFound = true
            targetPageToken = p.access_token || ''
            if (igAcc) targetIgAccount = igAcc
          }
        }
      }
    } catch (eAcc) {
      probeResult.accounts = { error: String(eAcc) }
    }

    // Se a página alvo 1343797128806374 não veio na lista, tenta diretamente:
    if (!targetPageFound) {
      try {
        const dtRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/1343797128806374?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 10,
        })
        probeResult.direct_target_page = { status: dtRes.statusCode, data: dtRes.json || dtRes.raw }
        if (dtRes.statusCode >= 200 && dtRes.statusCode < 300 && dtRes.json) {
          targetPageFound = true
          if (dtRes.json.access_token) targetPageToken = dtRes.json.access_token
          if (dtRes.json.instagram_business_account)
            targetIgAccount = dtRes.json.instagram_business_account
        }
      } catch (eDt) {
        probeResult.direct_target_page = { error: String(eDt) }
      }
    }

    // 3. GET /me/permissions
    try {
      const permRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 15,
      })
      probeResult.permissions = { status: permRes.statusCode, data: permRes.json || permRes.raw }
    } catch (ePerm) {
      probeResult.permissions = { error: String(ePerm) }
    }

    // Atualização do usuário conforme instrução da tarefa:
    // Se o token for válido e enxergar a página 1343797128806374 com instagram_business_account (username @mauro.brfimoveis):
    //   meta_instagram_user_token = esse token
    //   meta_instagram_business_id = o id do IG
    //   instagram_username = "mauro.brfimoveis"
    //   meta_page_access_token = o page token da página 1343797128806374
    // Se a página NÃO tiver IG vinculado ainda:
    //   apenas diagnostique (não salve nada além do user token)
    user.set('meta_instagram_user_token', token)
    probeResult.saved_changes.meta_instagram_user_token = masked

    if (targetPageFound && targetIgAccount) {
      const foundIgId = String(targetIgAccount.id || '').trim()
      const foundIgUser = String(
        targetIgAccount.username || targetIgAccount.name || 'mauro.brfimoveis',
      ).trim()
      user.set('meta_instagram_business_id', foundIgId)
      user.set('instagram_username', foundIgUser || 'mauro.brfimoveis')
      probeResult.saved_changes.meta_instagram_business_id = foundIgId
      probeResult.saved_changes.instagram_username = foundIgUser || 'mauro.brfimoveis'
      if (targetPageToken) {
        user.set('meta_page_access_token', targetPageToken)
        user.set('meta_instagram_page_token', targetPageToken)
        probeResult.saved_changes.meta_page_access_token = '...' + targetPageToken.slice(-4)
      }
    }
    app.saveNoValidate(user)

    // Grava o relatório completo em system_logs para inspeção imediata via db_query
    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol)
    logRec.set('user_id', user.id)
    logRec.set('type', 'meta_token_diagnostic')
    logRec.set('message', 'Meta User Access Token Diagnostic Run')
    logRec.set('details', JSON.stringify(probeResult))
    logRec.set(
      'payload',
      JSON.stringify({ probe: 'meta_user_token_diagnostic', masked_token: masked }),
    )
    app.saveNoValidate(logRec)
  },
  (app) => {},
)

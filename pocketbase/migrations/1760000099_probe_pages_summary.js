migrate(
  (app) => {
    let user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {}
    if (!user) return

    const userTok = user.getString('meta_instagram_user_token') || ''
    const results = {}

    // Obter dados completos de /me/accounts
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 10,
      })
      if (res.statusCode === 200 && res.json && res.json.data) {
        for (let i = 0; i < res.json.data.length; i++) {
          const pg = res.json.data[i]
          results[pg.id] = {
            id: pg.id,
            name: pg.name,
            ig: pg.instagram_business_account,
            token_prefix: (pg.access_token || '').slice(0, 15),
          }

          // Se a página tem access_token, testa consultar 1219427617930954 com esse page token!
          if (pg.access_token) {
            try {
              const resCheckOfficial = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/1219427617930954?fields=id,name,instagram_business_account{id,username,name}&access_token=' +
                  encodeURIComponent(pg.access_token),
                method: 'GET',
                timeout: 8,
              })
              results['check_official_with_page_' + pg.id] = {
                status: resCheckOfficial.statusCode,
                json: resCheckOfficial.json,
              }
            } catch (ePage) {
              results['check_official_with_page_' + pg.id] = { error: String(ePage) }
            }
          }
        }
      }
    } catch (e) {
      results.error = String(e)
    }

    // Também testa com meta_whatsapp_access_token (system user)
    const sysTok = user.getString('meta_whatsapp_access_token') || ''
    if (sysTok) {
      try {
        const resSys = $http.send({
          url:
            'https://graph.facebook.com/v22.0/1219427617930954?fields=id,name,instagram_business_account{id,username,name}&access_token=' +
            encodeURIComponent(sysTok),
          method: 'GET',
          timeout: 8,
        })
        results.check_official_with_sys_tok = {
          status: resSys.statusCode,
          json: resSys.json,
        }
      } catch (eSys) {
        results.check_official_with_sys_tok = { error: String(eSys) }
      }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol, {
      type: 'probe_pages_summary',
      message: 'Probe pages summary',
      details: JSON.stringify(results),
      user_id: user.id,
    })
    app.save(rec)
  },
  (app) => {},
)

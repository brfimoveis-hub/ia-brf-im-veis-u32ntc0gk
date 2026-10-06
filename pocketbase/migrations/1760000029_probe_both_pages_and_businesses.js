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
    const userTok = user.getString('meta_instagram_user_token') || ''
    const pageTok = user.getString('meta_instagram_page_token') || ''

    let p1Direct = null
    let p2Direct = null
    let meAccountsData = null

    if (userTok) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,category,tasks,instagram_business_account{id,username,name}&limit=50',
          headers: { Authorization: 'Bearer ' + userTok },
          method: 'GET',
          timeout: 15,
        })
        meAccountsData = res.json
      } catch (e) {
        meAccountsData = { error: String(e) }
      }
    }

    // Verifica as duas páginas com seus tokens específicos ou userTok
    if (meAccountsData && meAccountsData.data && Array.isArray(meAccountsData.data)) {
      for (let i = 0; i < meAccountsData.data.length; i++) {
        const pg = meAccountsData.data[i]
        try {
          const testRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              pg.id +
              '?fields=id,name,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=' +
              encodeURIComponent(pg.access_token || pageTok || userTok),
            method: 'GET',
            timeout: 10,
          })
          if (i === 0) p1Direct = { page: pg.name, id: pg.id, res: testRes.json }
          if (i === 1) p2Direct = { page: pg.name, id: pg.id, res: testRes.json }
        } catch (err) {
          if (i === 0) p1Direct = { page: pg.name, id: pg.id, error: String(err) }
          if (i === 1) p2Direct = { page: pg.name, id: pg.id, error: String(err) }
        }
      }
    }

    // Também testa consultar o próprio usuário ou páginas via /me/businesses se houver
    let businessesData = null
    if (userTok) {
      try {
        const bRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me/businesses?fields=id,name,instagram_business_accounts{id,username,name}&access_token=' +
            encodeURIComponent(userTok),
          method: 'GET',
          timeout: 10,
        })
        businessesData = bRes.json
      } catch (eb) {
        businessesData = { error: String(eb) }
      }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_pages',
      message: 'Probe Pages Detail',
      payload: {
        p1: p1Direct,
        p2: p2Direct,
        businesses: businessesData,
        raw_accounts_count: meAccountsData && meAccountsData.data ? meAccountsData.data.length : 0,
      },
      details:
        'p1=' +
        JSON.stringify(p1Direct) +
        ' | p2=' +
        JSON.stringify(p2Direct) +
        ' | biz=' +
        JSON.stringify(businessesData),
    })
    app.save(logRec)
  },
  (app) => {},
)

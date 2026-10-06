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

    // 1. Testa na Página BRF Imóveis com pageTok:
    // fields=instagram_business_account,connected_instagram_account,page_backed_instagram_accounts
    let edgeTests = {}
    const pageId = '1343797128806374'

    const endpoints = [
      {
        name: 'page_fields',
        url:
          'https://graph.facebook.com/v22.0/' +
          pageId +
          '?fields=instagram_business_account,connected_instagram_account,instagram_accounts{id,username},page_backed_instagram_accounts{id,username}&access_token=' +
          encodeURIComponent(pageTok),
      },
      {
        name: 'page_instagram_accounts',
        url:
          'https://graph.facebook.com/v22.0/' +
          pageId +
          '/instagram_accounts?access_token=' +
          encodeURIComponent(pageTok),
      },
      {
        name: 'page_connected_instagram_account',
        url:
          'https://graph.facebook.com/v22.0/' +
          pageId +
          '/connected_instagram_account?access_token=' +
          encodeURIComponent(pageTok),
      },
      {
        name: 'user_accounts_all_fields',
        url:
          'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,instagram_business_account,connected_instagram_account&access_token=' +
          encodeURIComponent(userTok),
      },
      {
        name: 'debug_user_token',
        url:
          'https://graph.facebook.com/v22.0/debug_token?input_token=' +
          encodeURIComponent(userTok) +
          '&access_token=' +
          encodeURIComponent(userTok),
      },
      {
        name: 'debug_page_token',
        url:
          'https://graph.facebook.com/v22.0/debug_token?input_token=' +
          encodeURIComponent(pageTok) +
          '&access_token=' +
          encodeURIComponent(userTok),
      },
      {
        name: 'page_1219427617930954',
        url:
          'https://graph.facebook.com/v22.0/1219427617930954?fields=id,name,instagram_business_account&access_token=' +
          encodeURIComponent(userTok),
      },
    ]

    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i]
      try {
        const res = $http.send({
          url: ep.url,
          method: 'GET',
          timeout: 10,
        })
        edgeTests[ep.name] = { status: res.statusCode, json: res.json }
      } catch (err) {
        edgeTests[ep.name] = { error: String(err) }
      }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_edges',
      message: 'Probe Instagram Edges Detail',
      payload: edgeTests,
      details: JSON.stringify(edgeTests).substring(0, 500),
    })
    app.save(logRec)
  },
  (app) => {},
)

migrate(
  (app) => {
    let user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    const token = user.getString('meta_capi_token')

    const testUrls = [
      {
        name: 'bm1_client_ad_accounts',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097/client_ad_accounts?access_token=' +
          token,
      },
      {
        name: 'bm1_owned_ad_accounts',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097/owned_ad_accounts?access_token=' +
          token,
      },
      {
        name: 'bm2_client_ad_accounts',
        url:
          'https://graph.facebook.com/v21.0/3542548689255402/client_ad_accounts?access_token=' +
          token,
      },
      {
        name: 'bm2_owned_ad_accounts',
        url:
          'https://graph.facebook.com/v21.0/3542548689255402/owned_ad_accounts?access_token=' +
          token,
      },
      {
        name: 'bm1_assigned_users',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097/assigned_users?access_token=' + token,
      },
      {
        name: 'su_assigned_ad_accounts',
        url:
          'https://graph.facebook.com/v21.0/122104253163464389/assigned_ad_accounts?access_token=' +
          token,
      },
      {
        name: 'su_assigned_pages',
        url:
          'https://graph.facebook.com/v21.0/122104253163464389/assigned_pages?access_token=' +
          token,
      },
      {
        name: 'su_assigned_business_asset_groups',
        url:
          'https://graph.facebook.com/v21.0/122104253163464389/assigned_business_asset_groups?access_token=' +
          token,
      },
      {
        name: 'app_id_only',
        url: 'https://graph.facebook.com/v21.0/2442476629610638?access_token=' + token,
      },
    ]

    const subCol = app.findCollectionByNameOrId('system_logs')

    for (const t of testUrls) {
      let resData = null
      let status = 0
      try {
        const res = $http.send({ url: t.url, method: 'GET', timeout: 15 })
        status = res.statusCode
        resData = res.json || res.body
      } catch (err) {
        resData = { error: err.message }
      }

      const log = new Record(subCol)
      log.set('user_id', user.id)
      log.set('type', 'api_integration')
      log.set('message', 'BM_PROBE2_' + t.name + ' [' + status + ']')
      log.set('details', JSON.stringify(resData))
      log.set('payload', JSON.stringify({ url: t.url, status: status }))
      app.saveNoValidate(log)
    }
  },
  (app) => {},
)

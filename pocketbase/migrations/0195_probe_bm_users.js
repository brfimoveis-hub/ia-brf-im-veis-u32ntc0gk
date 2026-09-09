migrate(
  (app) => {
    let user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    const token = user.getString('meta_capi_token')

    const testUrls = [
      {
        name: 'bm1_system_users_admin',
        url: 'https://graph.facebook.com/v21.0/1676016233499097/system_users?access_token=' + token,
      },
      {
        name: 'bm2_system_users_admin',
        url: 'https://graph.facebook.com/v21.0/3542548689255402/system_users?access_token=' + token,
      },
      {
        name: 'bm1_business_users',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097/business_users?access_token=' + token,
      },
      {
        name: 'bm2_business_users',
        url:
          'https://graph.facebook.com/v21.0/3542548689255402/business_users?access_token=' + token,
      },
      {
        name: 'bm1_subscribed_apps',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097/subscribed_apps?access_token=' + token,
      },
      {
        name: 'bm2_subscribed_apps',
        url:
          'https://graph.facebook.com/v21.0/3542548689255402/subscribed_apps?access_token=' + token,
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
      log.set('message', 'BM_USERS_' + t.name + ' [' + status + ']')
      log.set('details', JSON.stringify(resData))
      log.set('payload', JSON.stringify({ url: t.url, status: status }))
      app.saveNoValidate(log)
    }
  },
  (app) => {},
)

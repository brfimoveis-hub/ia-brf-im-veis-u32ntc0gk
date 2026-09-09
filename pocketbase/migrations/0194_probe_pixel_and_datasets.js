migrate(
  (app) => {
    let user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    const token = user.getString('meta_capi_token')

    const testUrls = [
      {
        name: 'pixel_me_adspixels',
        url: 'https://graph.facebook.com/v21.0/me/adspixels?access_token=' + token,
      },
      {
        name: 'pixel_me_customaudiences',
        url: 'https://graph.facebook.com/v21.0/me/customaudiences?access_token=' + token,
      },
      {
        name: 'pixel_raw_id',
        url: 'https://graph.facebook.com/v21.0/1093869151209421?access_token=' + token,
      },
      {
        name: 'pixel_stats',
        url: 'https://graph.facebook.com/v21.0/1093869151209421/stats?access_token=' + token,
      },
      {
        name: 'pixel_assigned_users',
        url:
          'https://graph.facebook.com/v21.0/1093869151209421/assigned_users?access_token=' + token,
      },
      {
        name: 'pixel_shared_accounts',
        url:
          'https://graph.facebook.com/v21.0/1093869151209421/shared_accounts?access_token=' + token,
      },
      {
        name: 'bm1_pix_assigned',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097/adspixels?fields=id,name&access_token=' +
          token,
      },
      {
        name: 'bm2_pix_assigned',
        url:
          'https://graph.facebook.com/v21.0/3542548689255402/adspixels?fields=id,name&access_token=' +
          token,
      },
      {
        name: 'bm1_datasets',
        url: 'https://graph.facebook.com/v21.0/1676016233499097/datasets?access_token=' + token,
      },
      {
        name: 'bm2_datasets',
        url: 'https://graph.facebook.com/v21.0/3542548689255402/datasets?access_token=' + token,
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
      log.set('message', 'BM_PIXEL_' + t.name + ' [' + status + ']')
      log.set('details', JSON.stringify(resData))
      log.set('payload', JSON.stringify({ url: t.url, status: status }))
      app.saveNoValidate(log)
    }
  },
  (app) => {},
)

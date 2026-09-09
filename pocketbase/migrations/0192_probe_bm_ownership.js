migrate(
  (app) => {
    let user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    const token = user.getString('meta_capi_token')
    const whatsappToken = user.getString('meta_whatsapp_access_token')

    const testUrls = [
      { name: 'me_simple', url: 'https://graph.facebook.com/v21.0/me?access_token=' + token },
      {
        name: 'me_id_name',
        url: 'https://graph.facebook.com/v21.0/me?fields=id,name&access_token=' + token,
      },
      {
        name: 'su_id',
        url:
          'https://graph.facebook.com/v21.0/122104253163464389?fields=id,name,role&access_token=' +
          token,
      },
      {
        name: 'target_bm_basic',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097?fields=id,name&access_token=' + token,
      },
      {
        name: 'whatsapp_bm_basic',
        url:
          'https://graph.facebook.com/v21.0/3542548689255402?fields=id,name&access_token=' + token,
      },
      {
        name: 'app_basic',
        url:
          'https://graph.facebook.com/v21.0/2442476629610638?fields=id,name,business&access_token=' +
          token,
      },
      {
        name: 'app_with_whatsapp_token',
        url:
          'https://graph.facebook.com/v21.0/2442476629610638?fields=id,name,business&access_token=' +
          whatsappToken,
      },
      {
        name: 'target_bm_with_wa_token',
        url:
          'https://graph.facebook.com/v21.0/1676016233499097?fields=id,name&access_token=' +
          whatsappToken,
      },
      {
        name: 'wa_bm_with_wa_token',
        url:
          'https://graph.facebook.com/v21.0/3542548689255402?fields=id,name&access_token=' +
          whatsappToken,
      },
      {
        name: 'dataset_with_wa_token',
        url:
          'https://graph.facebook.com/v21.0/1093869151209421?fields=id,name,business,owner_business&access_token=' +
          whatsappToken,
      },
      {
        name: 'wa_token_debug',
        url:
          'https://graph.facebook.com/v21.0/debug_token?input_token=' +
          whatsappToken +
          '&access_token=' +
          whatsappToken,
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
      log.set('message', 'BM_PROBE_' + t.name + ' [' + status + ']')
      log.set('details', JSON.stringify(resData))
      log.set('payload', JSON.stringify({ url: t.url, status: status }))
      app.saveNoValidate(log)
    }
  },
  (app) => {},
)

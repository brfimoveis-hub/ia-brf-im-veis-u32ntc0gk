migrate(
  (app) => {
    let user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    const token = user.getString('meta_capi_token')

    const subCol = app.findCollectionByNameOrId('system_logs')

    // Testar /me?fields=business
    let resMeBiz = null
    try {
      const res = $http.send({
        url: 'https://graph.facebook.com/v21.0/me?fields=business&access_token=' + token,
        method: 'GET',
        timeout: 15,
      })
      resMeBiz = res.json || res.body
    } catch (e) {
      resMeBiz = { error: e.message }
    }

    const log1 = new Record(subCol)
    log1.set('user_id', user.id)
    log1.set('type', 'api_integration')
    log1.set('message', 'ME_BUSINESS_FIELD')
    log1.set('details', JSON.stringify(resMeBiz))
    app.saveNoValidate(log1)
  },
  (app) => {},
)

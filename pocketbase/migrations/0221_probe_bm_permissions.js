migrate(
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      return
    }
    if (!user) return

    const waToken = user.getString('meta_whatsapp_access_token') || ''
    const capiToken = user.getString('meta_capi_token') || ''

    const probeBM = (token, label) => {
      const res = {}
      try {
        const bmRes = $http.send({
          url:
            'https://graph.facebook.com/v21.0/me/businesses?fields=id,name,vertical,primary_page&access_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 10,
        })
        res.businesses = { status: bmRes.statusCode, body: bmRes.json }
      } catch (err) {
        res.businesses = { error: String(err) }
      }

      try {
        const permRes = $http.send({
          url:
            'https://graph.facebook.com/v21.0/me/permissions?access_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 10,
        })
        res.permissions = { status: permRes.statusCode, body: permRes.json }
      } catch (err) {
        res.permissions = { error: String(err) }
      }

      return res
    }

    const waBM = probeBM(waToken, 'wa')
    const capiBM = probeBM(capiToken, 'capi')

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol)
    rec.set('user_id', user.id)
    rec.set('type', 'api_integration')
    rec.set('message', 'Probe BM & Permissions')
    rec.set('details', JSON.stringify({ wa: waBM, capi: capiBM }))
    rec.set('payload', JSON.stringify({ probe: 'bm_permissions' }))
    app.saveNoValidate(rec)
  },
  (app) => {},
)

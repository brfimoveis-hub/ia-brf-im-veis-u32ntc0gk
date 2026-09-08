// Migration 0162: Verifica se o app 2442476629610638 está inscrito na WABA 3542548689255402
// e se não estiver, realiza a inscrição via POST /3542548689255402/subscribed_apps
migrate(
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {
        return
      }
    }

    const token = user.getString('meta_whatsapp_access_token')
    if (!token) return

    const wabaId = '3542548689255402'
    const logsCol = app.findCollectionByNameOrId('system_logs')

    // 1. GET subscribed_apps na WABA 3542548689255402
    let getRes = null
    try {
      const res = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })
      getRes = { statusCode: res.statusCode, json: res.json }
    } catch (e) {
      getRes = { error: e.message || String(e) }
    }

    let postRes = null
    const alreadySubscribed =
      getRes && getRes.json && Array.isArray(getRes.json.data) && getRes.json.data.length > 0

    if (!alreadySubscribed) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
          timeout: 20,
        })
        postRes = { statusCode: res.statusCode, json: res.json }
      } catch (e2) {
        postRes = { error: e2.message || String(e2) }
      }
    }

    const log = new Record(logsCol)
    log.set('type', 'waba_dup_subs_check')
    log.set(
      'message',
      'WABA 3542548689255402 subs: initial_count=' +
        ((getRes.json && getRes.json.data && getRes.json.data.length) || 0) +
        (postRes ? ' post_status=' + postRes.statusCode : ' (already subscribed)'),
    )
    log.set('user_id', user.id)
    log.set(
      'details',
      JSON.stringify({
        initial_get: getRes,
        post_subscribe: postRes,
      }),
    )
    app.save(log)
  },
  (app) => {},
)

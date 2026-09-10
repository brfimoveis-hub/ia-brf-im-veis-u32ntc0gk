migrate(
  (app) => {
    let log = null
    try {
      log = app.findFirstRecordByData('system_logs', 'id', 'jnf08ddd66zmsp0')
    } catch (_) {
      return
    }
    if (!log) return

    const fullDetails = JSON.parse(log.getString('details') || '{}')
    const wa = fullDetails.wa || {}
    const igRes = wa['17841408475954541?fields=id,username,name,ig_id']

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol)
    rec.set('user_id', log.getString('user_id'))
    rec.set('type', 'api_integration')
    rec.set('message', 'Unpacked IG 17841408475954541 result')
    rec.set('details', JSON.stringify(igRes))
    rec.set('payload', JSON.stringify({ probe: 'ig_target_res' }))
    app.saveNoValidate(rec)
  },
  (app) => {},
)

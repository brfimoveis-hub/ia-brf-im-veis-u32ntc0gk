migrate(
  (app) => {
    let log = null
    try {
      log = app.findFirstRecordByData('system_logs', 'id', 'xsyyr60psier359')
    } catch (_) {
      return
    }
    if (!log) return

    const fullDetails = JSON.parse(log.getString('details') || '{}')
    const errMsg =
      (fullDetails.body && fullDetails.body.error && fullDetails.body.error.message) || ''

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol)
    rec.set('user_id', log.getString('user_id'))
    rec.set('type', 'api_integration')
    rec.set('message', 'IG Error Exact Message: ' + errMsg.slice(0, 180))
    rec.set('details', errMsg)
    rec.set('payload', JSON.stringify({ probe: 'ig_err_slice' }))
    app.saveNoValidate(rec)
  },
  (app) => {},
)

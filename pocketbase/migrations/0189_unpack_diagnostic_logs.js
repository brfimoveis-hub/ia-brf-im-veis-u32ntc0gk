migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('system_logs', 'id', '225q7abcboza9bd')
      const details = JSON.parse(rec.getString('details'))

      const keys = Object.keys(details)
      for (const k of keys) {
        const subCol = app.findCollectionByNameOrId('system_logs')
        const subLog = new Record(subCol)
        subLog.set('user_id', 'g5jto8bhulw01bz')
        subLog.set('type', 'api_integration')
        subLog.set('message', 'DIAG_' + k)
        subLog.set('details', JSON.stringify(details[k]))
        subLog.set('payload', JSON.stringify({ key: k }))
        app.saveNoValidate(subLog)
      }
    } catch (e) {
      const subCol = app.findCollectionByNameOrId('system_logs')
      const subLog = new Record(subCol)
      subLog.set('user_id', 'g5jto8bhulw01bz')
      subLog.set('type', 'api_integration')
      subLog.set('message', 'DIAG_PARSE_ERROR: ' + e.message)
      app.saveNoValidate(subLog)
    }
  },
  (app) => {},
)

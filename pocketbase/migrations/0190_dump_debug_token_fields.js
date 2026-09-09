migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('system_logs', 'id', 'mpm4vv8nuu2gbjr')
      const subCol = app.findCollectionByNameOrId('system_logs')
      const subLog = new Record(subCol)
      subLog.set('user_id', 'g5jto8bhulw01bz')
      subLog.set('type', 'api_integration')
      subLog.set('message', 'DEBUG_TOKEN_SELF_FULL')
      // recortar em pedaços de 200 caracteres ou simplificar
      const d = JSON.parse(rec.getString('details'))
      subLog.set('details', JSON.stringify(d.data?.data || {}))
      app.saveNoValidate(subLog)
    } catch (_) {}
  },
  (app) => {},
)

migrate(
  (app) => {
    const l = app.findFirstRecordByData('system_logs', 'id', 'gr8z72vh9q6u9xq')
    if (!l) return
    const d = JSON.parse(l.getString('details') || '{}')

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(logsCol)
    r.set('user_id', 'g5jto8bhulw01bz')
    r.set('type', 'meta_token_debug_raw')
    r.set('message', 'Raw debug_token response')
    r.set('details', JSON.stringify(d.debug_token || {}))
    app.saveNoValidate(r)
  },
  (app) => {},
)

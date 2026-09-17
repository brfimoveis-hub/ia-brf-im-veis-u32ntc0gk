migrate(
  (app) => {
    const l = app.findFirstRecordByData('system_logs', 'id', 'v5n2qh2b79kmcw2')
    if (!l) return
    const d = JSON.parse(l.getString('details') || '{}')

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(logsCol)
    r.set('user_id', 'g5jto8bhulw01bz')
    r.set('type', 'meta_token_self_debug')
    r.set('message', 'Self Debug Result')
    r.set('details', JSON.stringify(d.self_debug || {}))
    app.saveNoValidate(r)
  },
  (app) => {},
)

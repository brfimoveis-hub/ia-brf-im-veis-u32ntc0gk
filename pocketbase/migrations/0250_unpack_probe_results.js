migrate(
  (app) => {
    const l = app.findFirstRecordByData('system_logs', 'id', 'ta9blz0klmuw41c')
    if (!l) return
    const d = JSON.parse(l.getString('details') || '{}')

    const logsCol = app.findCollectionByNameOrId('system_logs')

    const r1 = new Record(logsCol)
    r1.set('user_id', 'g5jto8bhulw01bz')
    r1.set('type', 'meta_token_probe_perms')
    r1.set('message', 'Probe Permissions')
    r1.set('details', JSON.stringify(d.permissions || {}))
    app.saveNoValidate(r1)

    const r2 = new Record(logsCol)
    r2.set('user_id', 'g5jto8bhulw01bz')
    r2.set('type', 'meta_token_probe_accounts')
    r2.set('message', 'Probe Accounts')
    r2.set('details', JSON.stringify(d.accounts || {}))
    app.saveNoValidate(r2)

    const r3 = new Record(logsCol)
    r3.set('user_id', 'g5jto8bhulw01bz')
    r3.set('type', 'meta_token_probe_me')
    r3.set('message', 'Probe Me')
    r3.set('details', JSON.stringify(d.me || {}))
    app.saveNoValidate(r3)
  },
  (app) => {},
)

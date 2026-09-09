migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('system_logs', 'id', '3p7bz2cm7cvzxx6')
      const d = JSON.parse(rec.getString('details'))

      const subCol = app.findCollectionByNameOrId('system_logs')

      // Granular
      const items = [
        { k: 'APP_ID', v: d.app_id },
        { k: 'APPLICATION', v: d.application },
        { k: 'TYPE', v: d.type },
        { k: 'USER_ID', v: d.user_id },
        { k: 'EXPIRES_AT', v: String(d.expires_at) },
        { k: 'SCOPES', v: JSON.stringify(d.scopes) },
        { k: 'GRANULAR_SCOPES', v: JSON.stringify(d.granular_scopes) },
        { k: 'IS_VALID', v: String(d.is_valid) },
      ]

      for (const item of items) {
        const sub = new Record(subCol)
        sub.set('user_id', 'g5jto8bhulw01bz')
        sub.set('type', 'api_integration')
        sub.set('message', 'DT_' + item.k + ': ' + (item.v || 'null'))
        sub.set('details', item.v || '')
        app.saveNoValidate(sub)
      }
    } catch (e) {
      const subCol = app.findCollectionByNameOrId('system_logs')
      const sub = new Record(subCol)
      sub.set('user_id', 'g5jto8bhulw01bz')
      sub.set('type', 'api_integration')
      sub.set('message', 'DT_ERROR: ' + e.message)
      app.saveNoValidate(sub)
    }
  },
  (app) => {},
)

migrate(
  (app) => {
    try {
      const l1 = app.findFirstRecordByData('system_logs', 'id', 'xmlnm5gf3pnw8cr')
      const d1 = JSON.parse(l1.getString('details') || '{}')

      const l4 = app.findFirstRecordByData('system_logs', 'id', '6sbht10ev5yvs7j')
      const d4 = JSON.parse(l4.getString('details') || '{}')

      const dumpCol = app.findCollectionByNameOrId('system_logs')

      const rec = new Record(dumpCol)
      rec.set('type', 'diagnostic_summary')
      rec.set(
        'message',
        'App: ' +
          (d1.application || '') +
          ' (' +
          (d1.app_id || '') +
          ') | User: ' +
          (d1.user_id || '') +
          ' | Scopes: ' +
          (d1.scopes ? d1.scopes.join(',') : '') +
          ' | Type: ' +
          (d1.type || '') +
          ' | Error: ' +
          (d4.body && d4.body.error ? d4.body.error.message : ''),
      )
      rec.set('details', JSON.stringify({ d1: d1, d4: d4 }))
      app.saveNoValidate(rec)
    } catch (e) {}
  },
  (app) => {},
)

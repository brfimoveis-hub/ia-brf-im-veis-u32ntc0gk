migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_logs')

    if (!col.fields.getByName('user_id')) {
      col.fields.add(new TextField({ name: 'user_id' }))
    }

    const existingData = {}
    try {
      const records = app.findRecordsByFilter('system_logs', '', '-created', 5000, 0)
      if (records && records.length > 0) {
        for (const r of records) {
          const detailsVal = r.get('details')
          if (detailsVal !== null && detailsVal !== undefined && detailsVal !== '') {
            if (typeof detailsVal === 'string') {
              existingData[r.id] = detailsVal
            } else {
              try {
                existingData[r.id] = JSON.stringify(detailsVal)
              } catch (_) {
                existingData[r.id] = String(detailsVal)
              }
            }
          }
        }
      }
    } catch (_) {}

    if (col.fields.getByName('details')) {
      col.fields.removeByName('details')
    }
    col.fields.add(new TextField({ name: 'details' }))
    app.save(col)

    for (const recordId in existingData) {
      try {
        app
          .db()
          .newQuery('UPDATE system_logs SET details = {:details} WHERE id = {:id}')
          .bind({ details: existingData[recordId], id: recordId })
          .execute()
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('system_logs')
      if (col.fields.getByName('user_id')) {
        col.fields.removeByName('user_id')
      }
      if (col.fields.getByName('details')) {
        col.fields.removeByName('details')
      }
      col.fields.add(new JSONField({ name: 'details' }))
      app.save(col)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')

    if (!col.fields.getByName('tags')) {
      col.fields.add(new JSONField({ name: 'tags' }))
      app.save(col)
      return
    }

    const existingData = {}
    try {
      const records = app.findRecordsByFilter('customers', '', '-created', 5000, 0)
      if (records && records.length > 0) {
        for (const r of records) {
          const tagsVal = r.getString('tags')
          if (tagsVal) existingData[r.id] = tagsVal
        }
      }
    } catch (_) {}

    col.removeField('tags')
    col.fields.add(new JSONField({ name: 'tags' }))
    app.save(col)

    for (const recordId in existingData) {
      const tagsStr = existingData[recordId]
      let tagsArray = []
      const trimmed = (tagsStr || '').trim()
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            tagsArray = parsed
          } else if (typeof parsed === 'string') {
            tagsArray = parsed
              .split(',')
              .map(function (t) {
                return t.trim()
              })
              .filter(function (t) {
                return t.length > 0
              })
          } else {
            tagsArray = [String(parsed)]
          }
        } catch (_) {
          tagsArray = trimmed
            .split(',')
            .map(function (t) {
              return t.trim()
            })
            .filter(function (t) {
              return t.length > 0
            })
        }
      }
      try {
        app
          .db()
          .newQuery('UPDATE customers SET tags = {:tags} WHERE id = {:id}')
          .bind({ tags: JSON.stringify(tagsArray), id: recordId })
          .execute()
      } catch (_) {}
    }

    try {
      app
        .db()
        .newQuery("UPDATE customers SET tags = '[]' WHERE tags IS NULL OR tags = ''")
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('customers')
      if (col.fields.getByName('tags')) {
        col.removeField('tags')
      }
      col.fields.add(new TextField({ name: 'tags' }))
      app.save(col)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_logs')

    col.fields.removeByName('details')
    col.fields.add(new JSONField({ name: 'details' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_logs')

    col.fields.removeByName('details')
    col.fields.add(new TextField({ name: 'details' }))
    app.save(col)
  },
)

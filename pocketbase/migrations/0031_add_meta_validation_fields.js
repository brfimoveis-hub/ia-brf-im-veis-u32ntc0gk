migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.add(new TextField({ name: 'meta_token_status' }))
    col.fields.add(new TextField({ name: 'meta_last_validated' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('meta_token_status')
    col.fields.removeByName('meta_last_validated')
    app.save(col)
  },
)

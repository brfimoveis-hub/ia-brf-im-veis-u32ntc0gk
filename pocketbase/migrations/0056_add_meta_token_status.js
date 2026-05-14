migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('meta_token_status')) {
      col.fields.add(new TextField({ name: 'meta_token_status' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('meta_token_status')
    app.save(col)
  },
)

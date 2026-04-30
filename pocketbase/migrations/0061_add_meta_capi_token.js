migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('meta_capi_token')) {
      col.fields.add(new TextField({ name: 'meta_capi_token' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('meta_capi_token')) {
      col.fields.removeByName('meta_capi_token')
      app.save(col)
    }
  },
)

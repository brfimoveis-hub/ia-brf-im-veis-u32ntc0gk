migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('meta_capi_status')) {
      col.fields.add(new TextField({ name: 'meta_capi_status' }))
    }
    if (!col.fields.getByName('meta_capi_error')) {
      col.fields.add(new TextField({ name: 'meta_capi_error' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('meta_capi_status')
    col.fields.removeByName('meta_capi_error')
    app.save(col)
  },
)

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.add(new TextField({ name: 'uazapi_admin_token' }))
    col.fields.add(new TextField({ name: 'uazapi_instance_number' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('uazapi_admin_token')
    col.fields.removeByName('uazapi_instance_number')
    app.save(col)
  },
)

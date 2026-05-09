migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('uazapi_domain')) {
      users.fields.add(new TextField({ name: 'uazapi_domain' }))
    }
    if (!users.fields.getByName('uazapi_token')) {
      users.fields.add(new TextField({ name: 'uazapi_token' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('uazapi_domain')
    users.fields.removeByName('uazapi_token')
    app.save(users)
  },
)

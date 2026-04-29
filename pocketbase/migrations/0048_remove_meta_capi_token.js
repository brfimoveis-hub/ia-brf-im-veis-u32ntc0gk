migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.removeByName('meta_capi_token')
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.add(new TextField({ name: 'meta_capi_token' }))
    app.save(collection)
  },
)

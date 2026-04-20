migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new TextField({ name: 'meta_pixel_id' }))
    users.fields.add(new TextField({ name: 'meta_capi_token' }))
    users.fields.add(new TextField({ name: 'meta_test_event_code' }))
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('meta_pixel_id')
    users.fields.removeByName('meta_capi_token')
    users.fields.removeByName('meta_test_event_code')
    app.save(users)
  },
)

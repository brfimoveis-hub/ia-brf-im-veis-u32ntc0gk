migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('meta_instagram_app_id')) {
      usersCol.fields.add(new TextField({ name: 'meta_instagram_app_id' }))
    }
    if (!usersCol.fields.getByName('meta_instagram_app_secret')) {
      usersCol.fields.add(new TextField({ name: 'meta_instagram_app_secret' }))
    }
    app.save(usersCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.fields.removeByName('meta_instagram_app_id')
    usersCol.fields.removeByName('meta_instagram_app_secret')
    app.save(usersCol)
  },
)

migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('meta_instagram_user_token')) {
      usersCol.fields.add(new TextField({ name: 'meta_instagram_user_token' }))
    }
    app.save(usersCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.fields.removeByName('meta_instagram_user_token')
    app.save(usersCol)
  },
)

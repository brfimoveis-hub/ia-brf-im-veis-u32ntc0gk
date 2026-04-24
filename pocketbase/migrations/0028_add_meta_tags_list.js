migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('meta_tags_list')) {
      users.fields.add(
        new JSONField({
          name: 'meta_tags_list',
          required: false,
        }),
      )
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('meta_tags_list')) {
      users.fields.removeByName('meta_tags_list')
      app.save(users)
    }
  },
)

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('ai_name')) {
      users.fields.add(new TextField({ name: 'ai_name' }))
    }
    if (!users.fields.getByName('ai_avatar')) {
      users.fields.add(
        new FileField({
          name: 'ai_avatar',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
    }
    if (!users.fields.getByName('ai_voice_id')) {
      users.fields.add(new TextField({ name: 'ai_voice_id' }))
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.removeByName('ai_name')
    users.fields.removeByName('ai_avatar')
    users.fields.removeByName('ai_voice_id')
    app.save(users)
  },
)

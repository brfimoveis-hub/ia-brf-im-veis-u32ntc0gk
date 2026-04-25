migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('ai_instructions')) {
      users.fields.add(new TextField({ name: 'ai_instructions' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('ai_instructions')
    app.save(users)
  },
)

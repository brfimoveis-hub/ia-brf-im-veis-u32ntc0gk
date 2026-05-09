migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const field = users.fields.getByName('ai_instructions')
    if (field) {
      field.max = 300000
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const field = users.fields.getByName('ai_instructions')
    if (field) {
      field.max = 0
      app.save(users)
    }
  },
)

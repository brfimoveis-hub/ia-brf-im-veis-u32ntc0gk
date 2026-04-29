migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const field = users.fields.getByName('ai_instructions')

    if (field) {
      field.max = 100000
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const field = users.fields.getByName('ai_instructions')

    if (field) {
      field.max = 5000
      app.save(users)
    }
  },
)

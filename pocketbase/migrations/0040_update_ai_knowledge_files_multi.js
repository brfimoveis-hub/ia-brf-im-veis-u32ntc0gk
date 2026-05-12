migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const field = users.fields.getByName('ai_knowledge_files')
    if (field) {
      field.maxSelect = 10
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const field = users.fields.getByName('ai_knowledge_files')
    if (field) {
      field.maxSelect = 1
      app.save(users)
    }
  },
)

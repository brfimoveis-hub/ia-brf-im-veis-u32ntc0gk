migrate(
  (app) => {
    const collections = ['_pb_users_auth_', 'cadences']
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        const field = col.fields.getByName('ai_instructions')
        if (field) {
          field.max = 100000
          app.save(col)
        }
      } catch (_) {}
    }
  },
  (app) => {
    const collections = ['_pb_users_auth_', 'cadences']
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        const field = col.fields.getByName('ai_instructions')
        if (field) {
          field.max = 5000
          app.save(col)
        }
      } catch (_) {}
    }
  },
)

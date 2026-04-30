migrate(
  (app) => {
    const collections = ['users', 'cadences', 'knowledge_base']

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col.fields.getByName('ai_instructions')) {
          col.fields.add(
            new TextField({
              name: 'ai_instructions',
              max: 100000,
            }),
          )
          app.save(col)
        }
      } catch (err) {
        // Ignore if collection doesn't exist
      }
    }
  },
  (app) => {
    const collections = ['users', 'cadences', 'knowledge_base']

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col.fields.getByName('ai_instructions')) {
          col.fields.add(
            new TextField({
              name: 'ai_instructions',
              max: 5000,
            }),
          )
          app.save(col)
        }
      } catch (err) {
        // Ignore if collection doesn't exist
      }
    }
  },
)

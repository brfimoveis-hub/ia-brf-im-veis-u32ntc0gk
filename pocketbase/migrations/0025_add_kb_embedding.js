migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('knowledge_base')
    if (!col.fields.getByName('embedding')) {
      try {
        col.fields.add(new VectorField({ name: 'embedding', dimensions: 1536, distance: 'cosine' }))
      } catch (err) {
        // Workaround for missing VectorField constructor in some environments:
        // Instantiating a plain Collection parses the plain object field into a valid core.Field
        const dummy = new Collection({
          name: 'dummy_kb',
          type: 'base',
          fields: [{ name: 'embedding', type: 'vector', dimensions: 1536, distance: 'cosine' }],
        })
        col.fields.add(dummy.fields.getByName('embedding'))
      }
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('knowledge_base')
    col.fields.removeByName('embedding')
    app.save(col)
  },
)

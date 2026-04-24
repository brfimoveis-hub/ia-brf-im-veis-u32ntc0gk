migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('knowledge_base')
    if (!col.fields.getByName('embedding')) {
      col.fields.add(new VectorField({ name: 'embedding', dimensions: 1536, distance: 'cosine' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('knowledge_base')
    col.fields.removeByName('embedding')
    app.save(col)
  },
)

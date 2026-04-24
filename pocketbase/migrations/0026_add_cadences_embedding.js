migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cadences')
    if (!col.fields.getByName('embedding')) {
      col.fields.add(new VectorField({ name: 'embedding', dimensions: 1536, distance: 'cosine' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cadences')
    col.fields.removeByName('embedding')
    app.save(col)
  },
)

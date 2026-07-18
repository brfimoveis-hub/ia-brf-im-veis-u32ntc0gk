migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    if (!col.fields.getByName('last_sent_at')) {
      col.fields.add(new DateField({ name: 'last_sent_at' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    const field = col.fields.getByName('last_sent_at')
    if (field) col.fields.remove(field)
    app.save(col)
  },
)

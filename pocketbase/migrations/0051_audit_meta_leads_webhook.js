migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    col.addIndex('idx_customers_source', false, 'source', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    col.removeIndex('idx_customers_source')
    app.save(col)
  },
)

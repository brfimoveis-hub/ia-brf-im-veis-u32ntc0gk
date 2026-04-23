migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    col.addIndex('idx_customers_email', false, 'email', '')
    col.addIndex('idx_customers_phone', false, 'phone', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    col.removeIndex('idx_customers_email')
    col.removeIndex('idx_customers_phone')
    app.save(col)
  },
)

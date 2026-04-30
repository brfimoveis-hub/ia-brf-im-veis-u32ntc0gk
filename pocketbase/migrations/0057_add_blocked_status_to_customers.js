migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    if (!col.fields.getByName('is_blocked')) {
      col.fields.add(new BoolField({ name: 'is_blocked' }))
    }
    col.addIndex('idx_customers_is_blocked', false, 'is_blocked', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    col.removeField('is_blocked')
    col.removeIndex('idx_customers_is_blocked')
    app.save(col)
  },
)

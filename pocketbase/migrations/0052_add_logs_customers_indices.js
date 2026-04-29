migrate(
  (app) => {
    const logsCol = app.findCollectionByNameOrId('system_logs')
    logsCol.addIndex('idx_system_logs_created', false, 'created', '')
    app.save(logsCol)

    const custCol = app.findCollectionByNameOrId('customers')
    custCol.addIndex('idx_customers_created', false, 'created', '')
    app.save(custCol)
  },
  (app) => {
    const logsCol = app.findCollectionByNameOrId('system_logs')
    logsCol.removeIndex('idx_system_logs_created')
    app.save(logsCol)

    const custCol = app.findCollectionByNameOrId('customers')
    custCol.removeIndex('idx_customers_created')
    app.save(custCol)
  },
)

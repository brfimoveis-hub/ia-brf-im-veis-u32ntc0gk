migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_logs')
    col.addIndex('idx_system_logs_type', false, 'type', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_logs')
    col.removeIndex('idx_system_logs_type')
    app.save(col)
  },
)

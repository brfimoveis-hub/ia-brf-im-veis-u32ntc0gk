migrate(
  (app) => {
    let logsCollection
    try {
      logsCollection = app.findCollectionByNameOrId('system_logs')
    } catch (err) {
      logsCollection = new Collection({
        name: 'system_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'type', type: 'text' },
          { name: 'message', type: 'text' },
          { name: 'details', type: 'json' },
          { name: 'payload', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(logsCollection)
    }

    try {
      const col = app.findCollectionByNameOrId('customers')
      if (!col.fields.getByName('meta_sync_status')) {
        col.fields.add(new TextField({ name: 'meta_sync_status' }))
        app.save(col)
      }
    } catch (err) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('customers')
      col.fields.removeByName('meta_sync_status')
      app.save(col)
    } catch (err) {}
  },
)

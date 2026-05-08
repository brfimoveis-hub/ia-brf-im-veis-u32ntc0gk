migrate(
  (app) => {
    const collection = new Collection({
      name: 'system_logs',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'type', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        { name: 'details', type: 'json' },
        { name: 'payload', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('system_logs')
    app.delete(collection)
  },
)

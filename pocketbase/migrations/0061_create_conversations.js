migrate(
  (app) => {
    if (app.hasTable('conversations')) return
    const collection = new Collection({
      name: 'conversations',
      type: 'base',
      listRule: "@request.auth.id != '' && customer_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && customer_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && customer_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && customer_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'customer_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('customers').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        {
          name: 'sender',
          type: 'select',
          required: true,
          values: ['customer', 'agent', 'ai', 'system'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('conversations')
      app.delete(collection)
    } catch (_) {}
  },
)

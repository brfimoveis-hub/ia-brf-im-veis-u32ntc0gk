migrate(
  (app) => {
    const collection = new Collection({
      name: 'conversations',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'customer_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('customers').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'content',
          type: 'text',
          required: true,
        },
        {
          name: 'sender',
          type: 'text',
          required: true,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_conversations_user_id ON conversations (user_id)',
        'CREATE INDEX idx_conversations_customer_id ON conversations (customer_id)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('conversations')
    app.delete(collection)
  },
)

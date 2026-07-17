migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const customersColId = app.findCollectionByNameOrId('customers').id

    const campaigns = new Collection({
      name: 'email_campaigns',
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
          collectionId: usersColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text' },
        { name: 'subject', type: 'text' },
        { name: 'content', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['draft', 'sending', 'completed', 'failed'],
          maxSelect: 1,
        },
        { name: 'total_recipients', type: 'number' },
        { name: 'success_count', type: 'number' },
        { name: 'failure_count', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(campaigns)

    const campaignsColId = app.findCollectionByNameOrId('email_campaigns').id

    const deliveries = new Collection({
      name: 'email_deliveries',
      type: 'base',
      listRule: "@request.auth.id != '' && campaign_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && campaign_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && campaign_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && campaign_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'campaign_id',
          type: 'relation',
          required: true,
          collectionId: campaignsColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'customer_id',
          type: 'relation',
          required: true,
          collectionId: customersColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'status', type: 'select', values: ['pending', 'sent', 'failed'], maxSelect: 1 },
        { name: 'error_message', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(deliveries)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('email_deliveries'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('email_campaigns'))
    } catch (_) {}
  },
)

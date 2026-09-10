migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const customersCol = app.findCollectionByNameOrId('customers')

    // 1. Criar coleção remarketing_campaigns
    const campaigns = new Collection({
      name: 'remarketing_campaigns',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'segment', type: 'text' },
        { name: 'message_text', type: 'text', required: true },
        { name: 'template_name', type: 'text' },
        { name: 'template_language', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['draft', 'sending', 'completed', 'failed', 'stopped'],
          maxSelect: 1,
        },
        { name: 'total_recipients', type: 'number' },
        { name: 'sent_count', type: 'number' },
        { name: 'delivered_count', type: 'number' },
        { name: 'failed_count', type: 'number' },
        { name: 'requires_template_count', type: 'number' },
        { name: 'sync_meta_capi', type: 'bool' },
        { name: 'capi_synced_count', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_rem_camp_user ON remarketing_campaigns (user_id, created DESC)'],
    })
    app.save(campaigns)

    // 2. Criar coleção remarketing_recipients
    const savedCampaigns = app.findCollectionByNameOrId('remarketing_campaigns')
    const recipients = new Collection({
      name: 'remarketing_recipients',
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
          collectionId: savedCampaigns.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'customer_id',
          type: 'relation',
          required: false,
          collectionId: customersCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'phone', type: 'text', required: true },
        { name: 'customer_name', type: 'text' },
        { name: 'resolved_message', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['queued', 'sent', 'delivered', 'failed', 'requires_template'],
          maxSelect: 1,
        },
        { name: 'whatsapp_message_id', type: 'text' },
        { name: 'error_message', type: 'text' },
        { name: 'in_24h_window', type: 'bool' },
        { name: 'sent_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_rem_rec_campaign ON remarketing_recipients (campaign_id, created DESC)',
        'CREATE INDEX idx_rem_rec_phone ON remarketing_recipients (phone)',
      ],
    })
    app.save(recipients)
  },
  (app) => {
    try {
      const recipients = app.findCollectionByNameOrId('remarketing_recipients')
      app.delete(recipients)
    } catch (_) {}
    try {
      const campaigns = app.findCollectionByNameOrId('remarketing_campaigns')
      app.delete(campaigns)
    } catch (_) {}
  },
)

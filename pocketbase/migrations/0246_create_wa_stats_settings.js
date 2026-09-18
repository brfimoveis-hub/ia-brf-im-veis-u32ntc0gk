migrate(
  (app) => {
    const collection = new Collection({
      name: 'wa_stats_settings',
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
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'usd_to_brl_rate',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'marketing_rate_usd',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'service_rate_usd',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'monthly_leads_goal',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'monthly_investment_budget_brl',
          type: 'number',
          required: false,
          min: 0,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_wa_stats_settings_user ON wa_stats_settings (user_id)'],
    })

    app.save(collection)

    // Seed default settings for any existing user
    try {
      const users = app.findRecordsByFilter('users', '', '-created', 10, 0)
      for (const u of users) {
        try {
          const record = new Record(collection)
          record.set('user_id', u.id)
          record.set('usd_to_brl_rate', 5.65)
          record.set('marketing_rate_usd', 0.0625)
          record.set('service_rate_usd', 0.008)
          record.set('monthly_leads_goal', 50)
          record.set('monthly_investment_budget_brl', 300)
          app.save(record)
        } catch (_) {}
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('wa_stats_settings')
      app.delete(collection)
    } catch (_) {}
  },
)

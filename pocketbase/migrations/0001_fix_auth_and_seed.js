migrate(
  (app) => {
    // 1. Create system_logs if not exists
    try {
      app.findCollectionByNameOrId('system_logs')
    } catch (_) {
      const sysLogs = new Collection({
        name: 'system_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'type', type: 'text', required: true },
          { name: 'message', type: 'text', required: true },
          { name: 'details', type: 'json', maxSize: 2000000 },
          { name: 'payload', type: 'json', maxSize: 2000000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(sysLogs)
    }

    // 2. Create customers if not exists
    try {
      app.findCollectionByNameOrId('customers')
    } catch (_) {
      const customers = new Collection({
        name: 'customers',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text' },
          { name: 'email', type: 'email' },
          { name: 'phone', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'source', type: 'text' },
          { name: 'is_blocked', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(customers)
    }

    // 3. Create cadences if not exists
    try {
      app.findCollectionByNameOrId('cadences')
    } catch (_) {
      const cadences = new Collection({
        name: 'cadences',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text' },
          { name: 'content', type: 'text' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(cadences)
    }

    // 4. Update users collection schema
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let updatedUsers = false
    if (!users.fields.getByName('meta_pixel_id')) {
      users.fields.add(new TextField({ name: 'meta_pixel_id' }))
      updatedUsers = true
    }
    if (!users.fields.getByName('meta_capi_token')) {
      users.fields.add(new TextField({ name: 'meta_capi_token' }))
      updatedUsers = true
    }
    if (!users.fields.getByName('meta_campaign_phone')) {
      users.fields.add(new TextField({ name: 'meta_campaign_phone' }))
      updatedUsers = true
    }
    if (updatedUsers) {
      app.save(users)
    }

    // 5. Seed admin user
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('brfimoveis@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('meta_pixel_id', '61569504383085')
      record.set('meta_capi_token', 'dummy_token_for_testing')
      record.set('meta_campaign_phone', '5548992098050')
      app.save(record)
    }
  },
  (app) => {
    // Revert logic is generally omitted for forward-only migrations on Skip Cloud
  },
)

migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    const templates = new Collection({
      name: 'whatsapp_templates',
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
        {
          name: 'category',
          type: 'select',
          values: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
          maxSelect: 1,
          required: true,
        },
        { name: 'language', type: 'text', required: true },
        { name: 'body_text', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'],
          maxSelect: 1,
        },
        { name: 'rejection_reason', type: 'text' },
        { name: 'meta_template_id', type: 'text' },
        { name: 'buttons', type: 'json' },
        { name: 'example_values', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_wa_tmpl_user_status ON whatsapp_templates (user_id, status)',
        'CREATE INDEX idx_wa_tmpl_name ON whatsapp_templates (user_id, name)',
      ],
    })
    app.save(templates)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('whatsapp_templates')
      app.delete(col)
    } catch (_) {}
  },
)

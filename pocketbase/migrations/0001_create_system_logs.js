migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('system_logs')
    } catch (_) {}

    if (!col) {
      col = new Collection({
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
            required: false,
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
      app.save(col)
    } else {
      col.listRule = null
      col.viewRule = null
      col.createRule = ''
      col.updateRule = null
      col.deleteRule = null

      const userIdField = col.fields.getByName('user_id')
      if (userIdField) {
        userIdField.required = false
      }

      const detailsField = col.fields.getByName('details')
      if (detailsField && detailsField.type !== 'json') {
        col.fields.removeByName('details')
        col.fields.add(new JSONField({ name: 'details' }))
      }

      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('system_logs')
      col.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
      col.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
      col.createRule = "@request.auth.id != ''"
      col.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
      col.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
      app.save(col)
    } catch (_) {}
  },
)

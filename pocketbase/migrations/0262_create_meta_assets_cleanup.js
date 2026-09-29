migrate(
  (app) => {
    try {
      const collection = new Collection({
        name: 'meta_assets_cleanup',
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
            name: 'asset_id',
            type: 'text',
            required: true,
          },
          {
            name: 'asset_name',
            type: 'text',
            required: false,
          },
          {
            name: 'asset_type',
            type: 'select',
            required: true,
            values: [
              'page',
              'instagram',
              'ad_account',
              'waba',
              'business',
              'pixel_dataset',
              'other',
            ],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pending', 'cleaned', 'kept'],
            maxSelect: 1,
          },
          {
            name: 'is_protected',
            type: 'bool',
            required: false,
          },
          {
            name: 'protection_reason',
            type: 'text',
            required: false,
          },
          {
            name: 'notes',
            type: 'text',
            required: false,
          },
          {
            name: 'metadata',
            type: 'json',
            required: false,
          },
          {
            name: 'cleaned_at',
            type: 'date',
            required: false,
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
          'CREATE UNIQUE INDEX idx_meta_cleanup_user_asset ON meta_assets_cleanup (user_id, asset_id)',
          'CREATE INDEX idx_meta_cleanup_status ON meta_assets_cleanup (status)',
          'CREATE INDEX idx_meta_cleanup_type ON meta_assets_cleanup (asset_type)',
        ],
      })
      app.save(collection)
    } catch (err) {
      console.log('Error creating meta_assets_cleanup collection: ' + err)
      throw err
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('meta_assets_cleanup')
      if (col) app.delete(col)
    } catch (_) {}
  },
)

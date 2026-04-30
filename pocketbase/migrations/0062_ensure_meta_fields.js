migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    let modified = false

    if (!users.fields.getByName('meta_pixel_id')) {
      users.fields.add(new TextField({ name: 'meta_pixel_id' }))
      modified = true
    }

    if (!users.fields.getByName('meta_capi_token')) {
      users.fields.add(new TextField({ name: 'meta_capi_token' }))
      modified = true
    }

    if (!users.fields.getByName('meta_token_status')) {
      users.fields.add(new TextField({ name: 'meta_token_status' }))
      modified = true
    }

    if (modified) {
      app.save(users)
    }
  },
  (app) => {
    // Safe down migration: do nothing to prevent data loss
  },
)

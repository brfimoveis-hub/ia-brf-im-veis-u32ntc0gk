migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    const fieldsToRemove = [
      'uazapi_domain',
      'uazapi_token',
      'uazapi_admin_token',
      'uazapi_instance_number',
      'uazapi_status',
      'uazapi_error',
    ]

    for (const fieldName of fieldsToRemove) {
      try {
        const field = col.fields.getByName(fieldName)
        if (field) {
          col.fields.removeByName(fieldName)
        }
      } catch (_) {}
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    if (!col.fields.getByName('uazapi_domain')) {
      col.fields.add(new TextField({ name: 'uazapi_domain' }))
    }
    if (!col.fields.getByName('uazapi_token')) {
      col.fields.add(new TextField({ name: 'uazapi_token' }))
    }
    if (!col.fields.getByName('uazapi_admin_token')) {
      col.fields.add(new TextField({ name: 'uazapi_admin_token' }))
    }
    if (!col.fields.getByName('uazapi_instance_number')) {
      col.fields.add(new TextField({ name: 'uazapi_instance_number' }))
    }
    if (!col.fields.getByName('uazapi_status')) {
      col.fields.add(new TextField({ name: 'uazapi_status' }))
    }
    if (!col.fields.getByName('uazapi_error')) {
      col.fields.add(new TextField({ name: 'uazapi_error' }))
    }

    app.save(col)
  },
)

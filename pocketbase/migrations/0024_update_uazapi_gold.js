migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('uazapi_instance_number', '554892098050')
      record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      record.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')

      if (!record.get('uazapi_token')) {
        record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      }

      app.save(record)
    } catch (_) {
      const users = app.findCollectionByNameOrId('users')
      const record = new Record(users)
      record.setEmail('brfimoveis@gmail.com')
      record.setPassword('Skip@Pass123')
      record.setVerified(true)
      record.set('name', 'BRF Imóveis Admin')
      record.set('uazapi_instance_number', '554892098050')
      record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      record.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      app.save(record)
    }
  },
  (app) => {
    // Can't cleanly revert specific fields without context
  },
)

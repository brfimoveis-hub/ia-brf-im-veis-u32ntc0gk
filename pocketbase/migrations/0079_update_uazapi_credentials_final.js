migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      record.set('uazapi_instance_number', '554892098050')
      record.set('uazapi_status', 'disconnected')
      app.save(record)
    } catch (_) {
      // Record might not exist if this is a fresh setup or email changed.
    }
  },
  (app) => {
    // Safe down-migration
  },
)

migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('uazapi_instance_number', '554892098050')
      record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      app.save(record)
    } catch (_) {}
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('uazapi_instance_number', '')
      record.set('uazapi_domain', '')
      record.set('uazapi_token', '')
      app.save(record)
    } catch (_) {}
  },
)

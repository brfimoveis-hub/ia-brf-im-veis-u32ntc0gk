migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      record.set('uazapi_instance_number', '554892098050')
      record.set('uazapi_token', 'TOKEN_AQUI')
      record.set('uazapi_admin_token', 'ADMIN_TOKEN_AQUI')
      app.save(record)
    } catch (_) {
      // silently skip if user is not found
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('uazapi_domain', '')
      record.set('uazapi_instance_number', '')
      record.set('uazapi_token', '')
      record.set('uazapi_admin_token', '')
      app.save(record)
    } catch (_) {}
  },
)

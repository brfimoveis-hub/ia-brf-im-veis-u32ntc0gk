migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_instance_number', 'brfimoveis')
      user.set('uazapi_status', 'disconnected')
      user.set('uazapi_error', '')
      app.saveNoValidate(user)
    } catch (_) {}
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_instance_number', '554892098050')
      app.saveNoValidate(user)
    } catch (_) {}
  },
)

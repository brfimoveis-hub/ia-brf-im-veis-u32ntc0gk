migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_instance_number', '554892098050')
      user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      user.set('uazapi_status', 'pending')
      user.set('uazapi_error', null)
      app.save(user)
    } catch (_) {
      // Skip if user does not exist
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('uazapi_status', '')
      app.save(user)
    } catch (_) {}
  },
)

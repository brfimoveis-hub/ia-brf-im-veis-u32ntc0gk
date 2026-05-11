migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      user.set('uazapi_instance_number', '554892098050')
      user.set('name', 'BRF Imóveis')
      app.save(user)
    } catch (_) {
      // User might not exist or be different
    }
  },
  (app) => {
    // no-op
  },
)

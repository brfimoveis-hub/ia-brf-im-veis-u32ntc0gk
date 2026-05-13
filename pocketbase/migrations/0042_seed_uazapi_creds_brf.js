migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')

      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      user.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      user.set('uazapi_instance_number', '554892098050')

      app.save(user)
    } catch (_) {
      // skip if user not found
    }
  },
  (app) => {},
)

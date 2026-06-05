migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_instance_number', '554892098050')
      user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      app.save(user)
    } catch (err) {}
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', '')
      user.set('uazapi_instance_number', '')
      user.set('uazapi_token', '')
      app.save(user)
    } catch (err) {}
  },
)

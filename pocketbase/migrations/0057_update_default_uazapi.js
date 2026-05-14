migrate((app) => {
  try {
    const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
    if (user) {
      if (!user.getString('uazapi_admin_token')) {
        user.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      }
      if (!user.getString('uazapi_domain')) {
        user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      }
      if (!user.getString('uazapi_instance_number')) {
        user.set('uazapi_instance_number', 'BRF 1')
      }
      app.save(user)
    }
  } catch (_) {
    // skip if user not found
  }
})

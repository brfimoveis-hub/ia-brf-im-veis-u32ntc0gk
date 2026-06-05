migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('uazapi_instance_number', '554892098050')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      user.set('uazapi_status', '')
      app.save(user)
    } catch (_) {
      // Record might not exist yet during initial setup, skip safely
    }
  },
  (app) => {
    // Down migration not strictly needed for credentials update
  },
)

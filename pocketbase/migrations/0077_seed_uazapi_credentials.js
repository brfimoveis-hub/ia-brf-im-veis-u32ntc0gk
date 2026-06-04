migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      if (user) {
        user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
        user.set('uazapi_token', '6df3aaaa-9198-40aa-9d0c-da3abd9c1934')
        user.set('uazapi_instance_number', '554892098050')
        app.saveNoValidate(user)
      }
    } catch (_) {
      // Record might not exist, silently skip
    }
  },
  (app) => {
    // Revert not strictly needed for this specific user update
  },
)

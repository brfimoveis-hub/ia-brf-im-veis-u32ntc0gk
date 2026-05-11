migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      let updated = false

      if (!user.getString('uazapi_domain')) {
        user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
        updated = true
      }

      if (!user.getString('uazapi_instance_number')) {
        user.set('uazapi_instance_number', '554892098050')
        updated = true
      }

      if (!user.getString('uazapi_token')) {
        user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
        updated = true
      }

      if (updated) {
        app.save(user)
      }
    } catch (_) {
      // User not found, safe to skip
    }
  },
  (app) => {
    // Revert not strictly necessary for this simple data fix
  },
)

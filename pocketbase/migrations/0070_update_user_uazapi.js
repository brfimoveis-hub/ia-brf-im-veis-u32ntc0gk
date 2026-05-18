migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_token', '04fca934-b2f9-4ba1-bdd2-4684aac2cdcd')
      user.set('uazapi_instance_number', '554891828050')
      user.set('uazapi_status', 'connected')
      app.save(user)
    } catch (_) {
      // skip if user not found
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_status', 'disconnected')
      app.save(user)
    } catch (_) {
      // skip if user not found
    }
  },
)

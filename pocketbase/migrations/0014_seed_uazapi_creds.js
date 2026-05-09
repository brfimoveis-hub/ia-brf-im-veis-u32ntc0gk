migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      user.set('meta_campaign_phone', '5548992098050')
      app.save(user)
    } catch (_) {}
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', '')
      user.set('uazapi_token', '')
      user.set('meta_campaign_phone', '')
      app.save(user)
    } catch (_) {}
  },
)

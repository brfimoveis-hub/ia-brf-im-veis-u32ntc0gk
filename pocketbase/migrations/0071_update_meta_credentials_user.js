migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('meta_whatsapp_business_id', '950541937872426')
      user.set('meta_pixel_id', '1522162279584545')
      user.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRaBWoxy4jSuUvKYvPXT9CiKb7mtHY3UrSEStSoYgteogbrJLiTUZCzZArtQVXjlgguUYcr8yf65KQZBsVSveAfbT459fn5CroUi3T5dRdeWmIAhfDRAjGZB83y79LEq1AdlMZCZA75cedJ0vwMMWsZBXUVgnGkxzmRfwZBxh28wvOFkWancNA8FgDAZDZD',
      )
      app.save(user)
    } catch (_) {
      // skip if user not found
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('meta_whatsapp_business_id', '')
      user.set('meta_pixel_id', '')
      user.set('meta_capi_token', '')
      app.save(user)
    } catch (_) {}
  },
)

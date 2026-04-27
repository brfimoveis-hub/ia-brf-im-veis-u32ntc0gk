migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('meta_pixel_id', '1522162279584545')
      app.save(user)
    } catch (_) {
      // Record does not exist, ignore
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      if (user.getString('meta_pixel_id') === '1522162279584545') {
        user.set('meta_pixel_id', '1632697264651953')
        app.save(user)
      }
    } catch (_) {
      // Record does not exist, ignore
    }
  },
)

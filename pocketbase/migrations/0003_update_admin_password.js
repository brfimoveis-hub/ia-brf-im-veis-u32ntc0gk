migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.setPassword('Skip@Pass123')
      app.save(record)
    } catch (e) {
      // Ignore if user not found
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.setPassword('Skip@Pass')
      app.save(record)
    } catch (e) {
      // Ignore if user not found
    }
  },
)

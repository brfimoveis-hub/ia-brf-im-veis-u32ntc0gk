migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      if (!record.getString('meta_token_status')) {
        record.set('meta_token_status', 'untested')
        app.save(record)
      }
    } catch (_) {
      // ignore if doesn't exist
    }
  },
  (app) => {
    // down logic is not strictly needed
  },
)

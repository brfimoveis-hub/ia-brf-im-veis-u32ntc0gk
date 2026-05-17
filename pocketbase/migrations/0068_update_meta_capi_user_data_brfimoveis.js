migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('meta_whatsapp_business_id', '27018364624521397')
      record.set('meta_pixel_id', '1522162279584545')
      app.save(record)
    } catch (_) {
      // Record not found, ignore
    }
  },
  (app) => {
    // down migration
  },
)

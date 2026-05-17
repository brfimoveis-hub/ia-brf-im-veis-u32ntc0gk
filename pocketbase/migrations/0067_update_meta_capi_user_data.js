migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('meta_whatsapp_business_id', '27018364624521397')
      record.set('meta_pixel_id', '1522162279584545')

      // Explicitly update only the desired fields, skipping validation to preserve existing instructions
      app.saveNoValidate(record)
    } catch (_) {
      // Record not found, skip safely
    }
  },
  (app) => {
    // Data update, no revert needed
  },
)

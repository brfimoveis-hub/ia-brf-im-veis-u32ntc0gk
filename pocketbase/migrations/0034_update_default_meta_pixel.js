migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      if (!record.getString('meta_pixel_id')) {
        record.set('meta_pixel_id', '1632697264651953')
        app.saveNoValidate(record)
      }
    } catch (_) {
      // user not found, skip
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      if (record.getString('meta_pixel_id') === '1632697264651953') {
        record.set('meta_pixel_id', '')
        app.saveNoValidate(record)
      }
    } catch (_) {
      // user not found, skip
    }
  },
)

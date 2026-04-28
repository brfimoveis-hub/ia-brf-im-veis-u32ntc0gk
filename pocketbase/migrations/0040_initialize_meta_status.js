migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'users',
        "meta_token_status = '' OR meta_token_status IS NULL",
        '',
        1000,
        0,
      )
      for (const record of records) {
        record.set('meta_token_status', 'untested')
        app.saveNoValidate(record)
      }
    } catch (_) {
      // ignore if no records
    }
  },
  (app) => {
    // no revert needed
  },
)

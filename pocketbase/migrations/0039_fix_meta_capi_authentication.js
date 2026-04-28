migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('meta_pixel_id', '1522162279584545')
      record.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRbhyIZC9Up3N9ZCgSWDZCvsN6zsOyFgzuTuw87L6kKMFop2BhAbfItsLg4SdprRfuZA0snnGXhml72jRWjQe1gzccPv9X9pnRyrECkmcg6QgZB32gT2SQj8GRED4txBhNE8tT7CFMhQyxgl4p2NpqpbSSvKZBgJzcDDsMADhjdpUlPUwlB8JAeSQZDZD',
      )
      record.set('meta_token_status', 'untested')
      app.save(record)
    } catch (_) {
      // Record does not exist, safe to ignore
    }
  },
  (app) => {
    // Revert not meaningful
  },
)

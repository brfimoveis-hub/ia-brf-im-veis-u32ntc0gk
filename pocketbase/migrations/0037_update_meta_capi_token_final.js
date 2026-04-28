migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRbhyIZC9Up3N9ZCgSWDZCvsN6zsOyFgzuTuw87L6kKMFop2BhAbfItsLg4SdprRfuZA0snnGXhml72jRWjQe1gzccPv9X9pnRyrECkmcg6QgZB32gT2SQj8GRED4txBhNE8tT7CFMhQyxgl4p2NpqpbSSvKZBgJzcDDsMADhjdpUlPUwlB8JAeSQZDZD',
      )
      app.saveNoValidate(user)
    } catch (_) {
      // skip if user doesn't exist
    }
  },
  (app) => {
    // no-op down migration
  },
)

migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      const newToken =
        'EAAzbADOLSAoBRbhyIZC9Up3N9ZCgSWDZCvsN6zsOyFgzuTuw87L6kKMFop2BhAbfItsLg4SdprRfuZA0snnGXhml72jRWjQe1gzccPv9X9pnRyrECkmcg6QgZB32gT2SQj8GRED4txBhNE8tT7CFMhQyxgl4p2NpqpbSSvKZBgJzcDDsMADhjdpUlPUwlB8JAeSQZDZD'

      user.set('meta_capi_token', newToken)
      user.set('meta_token_status', 'untested')
      user.set('meta_last_validated', '')
      app.save(user)

      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'system')
        logRecord.set('message', 'Meta Token Updated')
        logRecord.set(
          'details',
          'Token updated via migration 0036. Validation pending auto-trigger.',
        )
        app.save(logRecord)
      } catch (_) {}
    } catch (_) {}
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('meta_capi_token', '')
      user.set('meta_token_status', 'untested')
      user.set('meta_last_validated', '')
      app.save(user)
    } catch (_) {}
  },
)

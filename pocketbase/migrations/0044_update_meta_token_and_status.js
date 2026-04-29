migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRRlCoR1eyBYg4OlOdZCiNPO3uF4vP8NIeUtueSZAAs3O0RaI32WcVVQL54ZAGuKvxuGJINgy3CaLSAVN2eTUgSgEhXUakbDw9NLZBsQmIfI0nhjYAY9WLVafyMyPjfNfkUqN7kVQ2Ki4IFesbmitTnMXPDicToBABpshUBOm3qbTQaxKPJwtNwZDZD',
      )
      user.set('meta_token_status', 'untested')
      app.save(user)

      // Reset error logs for clean start
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logs = app.findRecordsByFilter(
        logsCol.id,
        "user_id = {:userId} && type = 'error'",
        '',
        100,
        0,
        { userId: user.id },
      )
      for (const log of logs) {
        if (log.getString('message').includes('Token CAPI')) {
          app.delete(log)
        }
      }
    } catch (_) {
      // skip if user not found
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_capi_token', '')
      user.set('meta_token_status', 'untested')
      app.save(user)
    } catch (_) {}
  },
)

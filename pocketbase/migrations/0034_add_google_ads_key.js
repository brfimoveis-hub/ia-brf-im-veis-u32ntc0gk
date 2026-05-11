migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('google_ads_webhook_key')) {
      users.fields.add(
        new TextField({
          name: 'google_ads_webhook_key',
        }),
      )
      app.save(users)
    }

    // Populate key for existing users
    const records = app.findRecordsByFilter('_pb_users_auth_', '1=1', '', 1000, 0)
    for (const record of records) {
      if (!record.getString('google_ads_webhook_key')) {
        record.set('google_ads_webhook_key', $security.randomString(32))
        app.saveNoValidate(record)
      }
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('google_ads_webhook_key')) {
      users.fields.removeByName('google_ads_webhook_key')
      app.save(users)
    }
  },
)

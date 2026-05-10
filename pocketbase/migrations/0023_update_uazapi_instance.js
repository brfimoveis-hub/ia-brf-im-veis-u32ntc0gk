migrate(
  (app) => {
    try {
      const users = app.findRecordsByFilter(
        '_pb_users_auth_',
        "uazapi_instance_number != ''",
        '',
        1000,
        0,
      )
      for (const user of users) {
        user.set('uazapi_instance_number', '554992098050')
        app.saveNoValidate(user)
      }
    } catch (_) {}
  },
  (app) => {},
)

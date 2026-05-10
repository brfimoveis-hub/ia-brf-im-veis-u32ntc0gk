migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      if (!record.getString('uazapi_instance_number')) {
        record.set('uazapi_instance_number', '554892098050')
        record.set('uazapi_domain', 'iabrfimveis.uazapi.com')
        app.save(record)
      }
    } catch (_) {}
  },
  (app) => {
    // Revert not strictly necessary for seeded instance defaults
  },
)

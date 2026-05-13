migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      if (record) {
        if (!record.getString('uazapi_domain')) {
          record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
        }
        if (!record.getString('uazapi_instance_number')) {
          record.set('uazapi_instance_number', '554892098050')
        }
        app.save(record)
      }
    } catch (_) {}
  },
  (app) => {},
)

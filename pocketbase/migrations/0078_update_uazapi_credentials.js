migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      record.set('uazapi_instance_number', '554892098050')
      app.save(record)
    } catch (_) {}
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      // We leave the domain as is for safety, but restore the previous token if down migration runs
      record.set('uazapi_token', '6df3aaaa-9198-40aa-9d0c-da3abd9c1934')
      app.save(record)
    } catch (_) {}
  },
)

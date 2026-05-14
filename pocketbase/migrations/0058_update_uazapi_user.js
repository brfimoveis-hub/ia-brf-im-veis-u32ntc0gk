migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('uazapi_domain', 'https://free.uazapi.com')
      record.set('uazapi_token', '64582e1c-d189-4ea6-8c6c-61f652991b64')
      record.set('uazapi_instance_number', '554891828050')
      record.set('uazapi_status', 'Conectado')
      app.save(record)
    } catch (err) {
      console.log('User brfimoveis@gmail.com not found for migration')
    }
  },
  (app) => {
    // down migration
  },
)

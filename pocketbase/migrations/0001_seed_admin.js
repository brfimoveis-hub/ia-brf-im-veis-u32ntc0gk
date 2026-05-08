migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Idempotent: skip if user already exists
    try {
      app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('brfimoveis@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Admin')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)

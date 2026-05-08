migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotent: skip if user already exists
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      return // already seeded
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
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)

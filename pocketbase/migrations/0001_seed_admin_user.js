migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Idempotent: skip if user already exists
    try {
      app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      return // already seeded
    } catch (_) {
      // Ignore error if user does not exist
    }

    try {
      const record = new Record(users)
      record.setEmail('brfimoveis@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    } catch (err) {
      console.log('Failed to seed admin user: ', err)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      app.delete(record)
    } catch (_) {
      // Ignore error if user does not exist
    }
  },
)

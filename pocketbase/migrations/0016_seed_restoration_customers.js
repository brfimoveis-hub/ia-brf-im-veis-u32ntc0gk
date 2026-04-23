migrate(
  (app) => {
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      return // User not found, nothing to seed
    }

    const customers = app.findCollectionByNameOrId('customers')

    // Mauro Silva
    try {
      app.findFirstRecordByData('customers', 'email', 'mauro@example.com')
    } catch (_) {
      const record = new Record(customers)
      record.set('user_id', user.id)
      record.set('name', 'Mauro Silva')
      record.set('first_name', 'Mauro')
      record.set('last_name', 'Silva')
      record.set('email', 'mauro@example.com')
      record.set('status', '5') // Active / Qualificado
      record.set('source', 'Manual')
      app.save(record)
    }

    // Ana Costa
    try {
      app.findFirstRecordByData('customers', 'email', 'ana.costa@tech.com')
    } catch (_) {
      const record = new Record(customers)
      record.set('user_id', user.id)
      record.set('name', 'Ana Costa')
      record.set('first_name', 'Ana')
      record.set('last_name', 'Costa')
      record.set('email', 'ana.costa@tech.com')
      record.set('status', '1') // Lead
      record.set('source', 'Google')
      app.save(record)
    }
  },
  (app) => {
    try {
      const mauro = app.findFirstRecordByData('customers', 'email', 'mauro@example.com')
      app.delete(mauro)
    } catch (_) {}

    try {
      const ana = app.findFirstRecordByData('customers', 'email', 'ana.costa@tech.com')
      app.delete(ana)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      user = new Record(users)
      user.setEmail('brfimoveis@gmail.com')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Admin')
      app.save(user)
    }

    const customersCol = app.findCollectionByNameOrId('customers')

    const initialLeads = [
      {
        name: 'João Silva',
        phone: '+55 11 98765-4321',
        email: 'joao@example.com',
        status: '1',
        tags: ['B2B'],
      },
      {
        name: 'Maria Oliveira',
        phone: '+55 21 91234-5678',
        email: 'maria@example.com',
        status: '4',
        tags: ['Importante'],
      },
      {
        name: 'Carlos Santos',
        phone: '+55 31 99876-5432',
        email: 'carlos@example.com',
        status: '6',
        tags: ['Varejo'],
      },
      {
        name: 'Ana Costa',
        phone: '+55 41 98888-7777',
        email: 'ana@example.com',
        status: '8',
        tags: ['Enterprise'],
      },
      {
        name: 'Pedro Mendes',
        phone: '+55 51 97777-6666',
        email: 'pedro@example.com',
        status: '2',
        tags: ['B2B'],
      },
    ]

    for (const lead of initialLeads) {
      try {
        app.findFirstRecordByData('customers', 'email', lead.email)
      } catch (_) {
        const record = new Record(customersCol)
        record.set('user_id', user.id)
        record.set('name', lead.name)
        record.set('email', lead.email)
        record.set('phone', lead.phone)
        record.set('status', lead.status)
        record.set('tags', lead.tags)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      app
        .db()
        .newQuery('DELETE FROM customers WHERE user_id = {:id}')
        .bind({ id: user.id })
        .execute()
    } catch (_) {}
  },
)

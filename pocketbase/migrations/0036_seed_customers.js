migrate(
  (app) => {
    const customers = [
      {
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '+5511999998888',
        status: 'Novo',
        source: 'Google Ads',
      },
      {
        name: 'Maria Oliveira',
        email: 'maria.o@provider.com',
        phone: '+5511988887777',
        status: 'Em Atendimento',
        source: 'Google Ads',
      },
      {
        name: 'Ricardo Santos',
        email: 'ricardo.santos@web.com',
        phone: '+5521977776666',
        status: 'Qualificado',
        source: 'Direto',
      },
      {
        name: 'Ana Costa',
        email: 'ana.costa@email.br',
        phone: '+5531966665555',
        status: 'Novo',
        source: 'Google Ads',
      },
      {
        name: 'Carlos Souza',
        email: 'c.souza@empresa.com',
        phone: '+5541955554444',
        status: 'Perdido',
        source: 'Uazapi',
      },
    ]

    const col = app.findCollectionByNameOrId('customers')

    for (const c of customers) {
      try {
        app.findFirstRecordByFilter('customers', 'email = {:email} || phone = {:phone}', {
          email: c.email,
          phone: c.phone,
        })
        // already exists
      } catch (_) {
        const record = new Record(col)
        record.set('name', c.name)
        record.set('email', c.email)
        record.set('phone', c.phone)
        record.set('status', c.status)
        record.set('source', c.source)
        app.save(record)
      }
    }
  },
  (app) => {
    const customers = [
      'joao.silva@email.com',
      'maria.o@provider.com',
      'ricardo.santos@web.com',
      'ana.costa@email.br',
      'c.souza@empresa.com',
    ]
    for (const email of customers) {
      try {
        const record = app.findFirstRecordByData('customers', 'email', email)
        app.delete(record)
      } catch (_) {}
    }
  },
)

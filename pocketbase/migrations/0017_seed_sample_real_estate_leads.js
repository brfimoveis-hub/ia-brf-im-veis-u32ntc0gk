migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      return
    }

    const customersCol = app.findCollectionByNameOrId('customers')

    const data = [
      {
        first_name: 'Ricardo',
        last_name: 'Almeida',
        name: 'Ricardo Almeida',
        email: 'ricardo.almeida@exemplo.com.br',
        phone: '11987654321',
        status: '1',
        source: 'Sample Data',
      },
      {
        first_name: 'Beatriz',
        last_name: 'Santos',
        name: 'Beatriz Santos',
        email: 'beatriz.santos@exemplo.com.br',
        phone: '21998877665',
        status: '7',
        source: 'Sample Data',
      },
      {
        first_name: 'Marcos',
        last_name: 'Oliveira',
        name: 'Marcos Oliveira',
        email: 'marcos.oli@exemplo.com.br',
        phone: '31977665544',
        status: '8',
        source: 'Sample Data',
      },
      {
        first_name: 'Fernanda',
        last_name: 'Lima',
        name: 'Fernanda Lima',
        email: 'fer.lima@exemplo.com.br',
        phone: '11966554433',
        status: '10',
        source: 'Sample Data',
      },
      {
        first_name: 'Juliana',
        last_name: 'Costa',
        name: 'Juliana Costa',
        email: 'ju.costa@exemplo.com.br',
        phone: '41955443322',
        status: '9',
        source: 'Sample Data',
      },
      {
        first_name: 'Roberto',
        last_name: 'Souza',
        name: 'Roberto Souza',
        email: 'roberto.souza@exemplo.com.br',
        phone: '11944332211',
        status: '1',
        source: 'Sample Data',
      },
      {
        first_name: 'Camila',
        last_name: 'Duarte',
        name: 'Camila Duarte',
        email: 'camila.duarte@exemplo.com.br',
        phone: '51933221100',
        status: '1',
        source: 'Sample Data',
      },
      {
        first_name: 'André',
        last_name: 'Ferreira',
        name: 'André Ferreira',
        email: 'andre.fer@exemplo.com.br',
        phone: '11922110099',
        status: '7',
        source: 'Sample Data',
      },
      {
        first_name: 'Patrícia',
        last_name: 'Mendes',
        name: 'Patrícia Mendes',
        email: 'patricia.mendes@exemplo.com.br',
        phone: '61911009988',
        status: '8',
        source: 'Sample Data',
      },
      {
        first_name: 'Lucas',
        last_name: 'Rocha',
        name: 'Lucas Rocha',
        email: 'lucas.rocha@exemplo.com.br',
        phone: '11900998877',
        status: '1',
        source: 'Sample Data',
      },
    ]

    for (const item of data) {
      try {
        app.findFirstRecordByData('customers', 'email', item.email)
      } catch (_) {
        const record = new Record(customersCol)
        record.set('user_id', admin.id)
        record.set('name', item.name)
        record.set('first_name', item.first_name)
        record.set('last_name', item.last_name)
        record.set('email', item.email)
        record.set('email_1_value', item.email)
        record.set('phone', item.phone)
        record.set('phone_1_value', item.phone)
        record.set('status', item.status)
        record.set('source', item.source)
        app.save(record)
      }
    }
  },
  (app) => {
    const leadsEmails = [
      'ricardo.almeida@exemplo.com.br',
      'beatriz.santos@exemplo.com.br',
      'marcos.oli@exemplo.com.br',
      'fer.lima@exemplo.com.br',
      'ju.costa@exemplo.com.br',
      'roberto.souza@exemplo.com.br',
      'camila.duarte@exemplo.com.br',
      'andre.fer@exemplo.com.br',
      'patricia.mendes@exemplo.com.br',
      'lucas.rocha@exemplo.com.br',
    ]

    for (const email of leadsEmails) {
      try {
        const record = app.findFirstRecordByData('customers', 'email', email)
        app.delete(record)
      } catch (_) {}
    }
  },
)

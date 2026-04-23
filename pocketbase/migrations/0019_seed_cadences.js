migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      const collection = app.findCollectionByNameOrId('cadences')

      const existing = app.findRecordsByFilter('cadences', `user_id = '${user.id}'`, '', 1, 0)
      if (existing.length > 0) return // already seeded

      const seeds = [
        {
          title: 'Primeiro Contato',
          content:
            'Olá! Vi que você se interessou pelo nosso imóvel. Gostaria de agendar uma visita?',
          order: 1,
          is_active: true,
        },
        {
          title: 'Follow-up 1',
          content:
            'Passando para saber se conseguiu analisar a proposta que enviei ontem. Qualquer dúvida, estou à disposição!',
          order: 2,
          is_active: true,
        },
        {
          title: 'Fechamento',
          content: 'Podemos seguir com a assinatura do contrato? Já preparei a documentação.',
          order: 3,
          is_active: true,
        },
      ]

      for (const s of seeds) {
        const record = new Record(collection)
        record.set('user_id', user.id)
        record.set('title', s.title)
        record.set('content', s.content)
        record.set('order', s.order)
        record.set('is_active', s.is_active)
        app.save(record)
      }
    } catch (_) {
      // User not found, skip seeding
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      const records = app.findRecordsByFilter('cadences', `user_id = '${user.id}'`, '', 100, 0)
      for (const record of records) {
        app.delete(record)
      }
    } catch (_) {}
  },
)

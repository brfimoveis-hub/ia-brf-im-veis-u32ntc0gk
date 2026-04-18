migrate(
  (app) => {
    const customers = app.findRecordsByFilter('customers', '1=1', 'created', 3, 0)
    if (customers.length === 0) return

    const conversations = app.findCollectionByNameOrId('conversations')

    try {
      app.findFirstRecordByData('conversations', 'customer_id', customers[0].id)
      return // already seeded
    } catch (_) {}

    const user_id = customers[0].getString('user_id')

    const seedMessages = [
      { c_id: customers[0].id, s: 'user', t: 'Olá, bom dia!' },
      {
        c_id: customers[0].id,
        s: 'ai',
        t: 'Olá! Sou a assistente virtual da empresa. Como posso te ajudar hoje?',
      },
      { c_id: customers[0].id, s: 'user', t: 'Gostaria de saber sobre os planos disponíveis.' },
      {
        c_id: customers[0].id,
        s: 'system',
        t: 'IA analisou a intenção e moveu o lead para "Qualificação".',
      },
      {
        c_id: customers[0].id,
        s: 'ai',
        t: 'Temos três planos principais: Básico, Pro e Enterprise. O plano Básico começa em R$99/mês. Quer que eu envie o PDF com todos os detalhes?',
      },
      { c_id: customers[0].id, s: 'user', t: 'Sim, gostaria de saber mais.' },
      {
        c_id: customers[0].id,
        s: 'system',
        t: 'Sentimento atualizado para "Curioso". Próximo passo sugerido: Enviar material.',
      },
    ]

    for (const msg of seedMessages) {
      const r = new Record(conversations)
      r.set('user_id', user_id)
      r.set('customer_id', msg.c_id)
      r.set('sender', msg.s)
      r.set('content', msg.t)
      app.save(r)
    }
  },
  (app) => {
    const res = app.findRecordsByFilter('conversations', "sender = 'system'")
    for (const r of res) {
      app.delete(r)
    }
  },
)

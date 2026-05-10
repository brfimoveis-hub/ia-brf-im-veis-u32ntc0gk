migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cadences')

    const cadences = [
      {
        title: 'Contato Inicial (Dia 1)',
        content:
          'Olá! Tudo bem? Sou da BRF Imóveis. Vi que você se interessou por um dos nossos imóveis.',
        ai_instructions:
          'O objetivo principal desta etapa é entender o perfil do cliente e se ele busca compra ou aluguel.',
        order: 1,
        is_active: true,
      },
      {
        title: 'Acompanhamento (Dia 3)',
        content:
          'Oi! Só passando para saber se você conseguiu ver as opções que enviei e se alguma chamou a sua atenção.',
        ai_instructions: 'O objetivo é retomar o contato e incentivar a agendar uma visita.',
        order: 2,
        is_active: true,
      },
      {
        title: 'Agendamento de Visita (Dia 7)',
        content: 'Podemos agendar uma visita sem compromisso? Assim você conhece melhor as opções.',
        ai_instructions:
          'Foque em sugerir horários e dias da semana disponíveis para a visita presencial.',
        order: 3,
        is_active: true,
      },
    ]

    let adminUser = null
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {}

    for (const data of cadences) {
      try {
        app.findFirstRecordByData('cadences', 'title', data.title)
      } catch (_) {
        const record = new Record(col)
        record.set('title', data.title)
        record.set('content', data.content)
        record.set('ai_instructions', data.ai_instructions)
        record.set('order', data.order)
        record.set('is_active', data.is_active)
        if (adminUser) {
          record.set('user_id', adminUser.id)
        }
        app.save(record)
      }
    }
  },
  (app) => {},
)

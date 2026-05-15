migrate(
  (app) => {
    const cadencesCol = app.findCollectionByNameOrId('cadences')

    const goldenCadences = [
      {
        title: 'D0 - Contato Imediato',
        content: 'Olá, recebemos seu interesse. Podemos falar agora?',
        order: 0,
        ai_instructions: 'Seja acolhedor e direto ao ponto.',
        is_active: true,
      },
      {
        title: 'D1 - Follow up 1',
        content: 'Olá, conseguiu dar uma olhada no material que enviei?',
        order: 1,
        ai_instructions: 'Tente agendar uma visita e entenda as dúvidas.',
        is_active: true,
      },
      {
        title: 'D2 - Follow up 2',
        content: 'Ainda está procurando opções de imóveis?',
        order: 2,
        ai_instructions: 'Foque nos benefícios e segurança do investimento.',
        is_active: true,
      },
      {
        title: 'D3 - Follow up 3',
        content: 'Temos novas opções e oportunidades na sua região de interesse.',
        order: 3,
        ai_instructions: 'Mostre escassez e urgência nas oportunidades atuais.',
        is_active: true,
      },
      {
        title: 'D4 - Follow up 4',
        content: 'Gostaria de falar com um corretor especialista para tirar suas dúvidas?',
        order: 4,
        ai_instructions: 'Passagem para o atendimento humano, crie rapport.',
        is_active: true,
      },
      {
        title: 'D5 - Follow up 5',
        content: 'Temos condições especiais e flexíveis este mês. Vamos conversar?',
        order: 5,
        ai_instructions: 'Ofereça vantagens e facilidades na negociação.',
        is_active: true,
      },
      {
        title: 'D6 - Follow up 6',
        content: 'Uma oportunidade incrível acabou de surgir na sua região preferida.',
        order: 6,
        ai_instructions: 'Seja específico e personalizado no atendimento.',
        is_active: true,
      },
      {
        title: 'D7 - Follow up 7',
        content: 'Podemos fechar negócio e agendar uma reunião?',
        order: 7,
        ai_instructions: 'Direto ao ponto, focado no fechamento e na tomada de decisão.',
        is_active: true,
      },
      {
        title: 'D8 - Follow up 8',
        content: 'Última chance para garantir as condições atuais antes das atualizações.',
        order: 8,
        ai_instructions: 'Ultimato amigável e gatilho de escassez forte.',
        is_active: true,
      },
      {
        title: 'D9 - Despedida/Nutrição',
        content: 'Agradecemos o contato. Estaremos aqui quando precisar ou mudar de ideia.',
        order: 9,
        ai_instructions: 'Deixe as portas abertas, seja extremamente educado e encerre a cadência.',
        is_active: true,
      },
    ]

    let userId = null
    try {
      const users = app.findRecordsByFilter('_pb_users_auth_', '1=1', '', 1, 0)
      if (users && users.length > 0) {
        userId = users[0].id
      }
    } catch (_) {}

    for (const c of goldenCadences) {
      try {
        app.findFirstRecordByData('cadences', 'title', c.title)
      } catch (_) {
        const record = new Record(cadencesCol)
        record.set('title', c.title)
        record.set('content', c.content)
        record.set('order', c.order)
        record.set('ai_instructions', c.ai_instructions)
        record.set('is_active', c.is_active)
        if (userId) record.set('user_id', userId)
        app.save(record)
      }
    }
  },
  (app) => {
    // down migration
  },
)

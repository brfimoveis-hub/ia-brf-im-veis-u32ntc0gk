migrate(
  (app) => {
    const logsCol = app.findCollectionByNameOrId('system_logs')
    if (!logsCol.fields.getByName('details')) {
      logsCol.fields.add(new JSONField({ name: 'details' }))
    }
    if (!logsCol.fields.getByName('payload')) {
      logsCol.fields.add(new JSONField({ name: 'payload' }))
    }
    app.save(logsCol)

    const cadences = [
      {
        title: 'D0: Welcome BIA',
        content: 'Olá! Sou a BIA...',
        ai_instructions: 'Instant WhatsApp reply + Villa dos Açores book.',
        order: 0,
      },
      {
        title: 'D1: Veed.io Video',
        content: 'Veja este vídeo da planta LM311...',
        ai_instructions: 'Virtual tour of plant LM311.',
        order: 1,
      },
      {
        title: 'D2: Financial Filter',
        content: 'Como funciona sua renda? É autônomo?',
        ai_instructions: 'Ask about simulation for self-employed.',
        order: 2,
      },
      {
        title: 'D3: Social Proof',
        content: 'Veja algumas fotos da obra...',
        ai_instructions: 'Construction photos/testimonials from Rio Caveiras.',
        order: 3,
      },
      {
        title: 'D4: Human Check-in',
        content: 'O Mauro vai te enviar um áudio agora...',
        ai_instructions: 'Alert for Mauro to send personalized audio.',
        order: 4,
      },
      {
        title: 'D5: Market Comparison',
        content: 'Você sabia que investir em Biguaçu...',
        ai_instructions: 'Biguaçu Investment vs. Rent.',
        order: 5,
      },
      {
        title: 'D6: Urgency Trigger',
        content: 'Atenção: Restam apenas 4 unidades...',
        ai_instructions: 'Only 4 units left at R$ 4.930,77/m².',
        order: 6,
      },
      {
        title: 'D7: VIP Coffee Invitation',
        content: 'Gostaria de agendar um café no nosso plantão VIP?',
        ai_instructions: 'Schedule visit to the sales stand.',
        order: 7,
      },
      {
        title: 'D8: Technical FAQ',
        content: 'Tem dúvidas sobre ITBI ou prazos de obra?',
        ai_instructions: 'BIA answers taxes/deadlines.',
        order: 8,
      },
      {
        title: 'D9: Re-engagement',
        content: 'Temos um bônus exclusivo...',
        ai_instructions: 'Exclusive bonus/planned kitchen offer.',
        order: 9,
      },
    ]

    const cadencesCol = app.findCollectionByNameOrId('cadences')
    app.db().newQuery('DELETE FROM cadences').execute()

    cadences.forEach((c) => {
      const record = new Record(cadencesCol)
      record.set('title', c.title)
      record.set('content', c.content)
      record.set('ai_instructions', c.ai_instructions)
      record.set('order', c.order)
      record.set('is_active', true)
      app.save(record)
    })
  },
  (app) => {
    const logsCol = app.findCollectionByNameOrId('system_logs')
    if (logsCol.fields.getByName('details')) {
      logsCol.fields.removeByName('details')
    }
    if (logsCol.fields.getByName('payload')) {
      logsCol.fields.removeByName('payload')
    }
    app.save(logsCol)
  },
)

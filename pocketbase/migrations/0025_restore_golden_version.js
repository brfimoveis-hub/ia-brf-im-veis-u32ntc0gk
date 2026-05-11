migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminId = null
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      admin.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      admin.set('uazapi_instance_number', '554892098050')
      admin.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      app.save(admin)
      adminId = admin.id
    } catch (_) {}

    const cadencesCol = app.findCollectionByNameOrId('cadences')
    const goldenCadences = [
      {
        order: 0,
        title: 'D0 - Boas-vindas BIA',
        content: "Instant WhatsApp response with the 'Villa dos Açores' book.",
        ai_instructions:
          "Responder instantaneamente com o book de apresentação do 'Villa dos Açores'.",
        is_active: true,
      },
      {
        order: 1,
        title: 'D1 - Vídeo Tour',
        content: 'Automated virtual tour of the LM311 floor plan.',
        ai_instructions: 'Enviar o tour virtual automatizado da planta LM311.',
        is_active: true,
      },
      {
        order: 2,
        title: 'D2 - Filtro Financeiro',
        content: "BIA asks: 'Do you already have a simulation for self-employed?'",
        ai_instructions:
          'Perguntar se o lead já possui uma simulação para autônomo (Filtro Financeiro).',
        is_active: true,
      },
      {
        order: 3,
        title: 'D3 - Prova Social',
        content: "Photo of the construction site or customer testimonial from 'Rio Caveiras'.",
        ai_instructions: "Enviar foto da obra ou depoimento de um cliente do 'Rio Caveiras'.",
        is_active: true,
      },
      {
        order: 4,
        title: 'D4 - Check-in Humano',
        content: "CRM Alert for agent 'Mauro' to send a personalized audio.",
        ai_instructions:
          'Acionar o alerta de CRM para o corretor Mauro enviar um áudio personalizado.',
        is_active: true,
      },
      {
        order: 5,
        title: 'D5 - Comparativo',
        content: 'Infographic: Investment in Biguaçu vs. Rent.',
        ai_instructions: 'Enviar infográfico comparando Investimento em Biguaçu vs Aluguel.',
        is_active: true,
      },
      {
        order: 6,
        title: 'D6 - Urgência',
        content: "Scarcity trigger: 'Only 4 units left at R$ 4,930.77/m²'.",
        ai_instructions:
          'Usar gatilho de escassez: informar que restam apenas 4 unidades a R$ 4.930,77/m².',
        is_active: true,
      },
      {
        order: 7,
        title: 'D7 - Convite Café VIP',
        content: 'Scheduling a physical visit to the sales stand.',
        ai_instructions:
          'Fazer o convite VIP para agendar uma visita presencial no plantão de vendas.',
        is_active: true,
      },
      {
        order: 8,
        title: 'D8 - FAQ Técnico',
        content: 'BIA clarifies doubts about deeds, taxes, and delivery dates.',
        ai_instructions: 'Esclarecer dúvidas técnicas sobre escrituras, taxas e prazos de entrega.',
        is_active: true,
      },
      {
        order: 9,
        title: 'D9 - Reengajamento',
        content: 'Exclusive bonus offer (e.g., Planned Kitchen) for closing.',
        ai_instructions:
          'Oferecer um bônus exclusivo (ex: Cozinha Planejada) para incentivar o fechamento.',
        is_active: true,
      },
    ]

    for (const c of goldenCadences) {
      try {
        app.findFirstRecordByData('cadences', 'title', c.title)
      } catch (_) {
        const record = new Record(cadencesCol)
        record.set('title', c.title)
        record.set('content', c.content)
        record.set('ai_instructions', c.ai_instructions)
        record.set('order', c.order)
        record.set('is_active', c.is_active)
        if (adminId) {
          record.set('user_id', adminId)
        }
        app.save(record)
      }
    }
  },
  (app) => {
    // no-op down
  },
)

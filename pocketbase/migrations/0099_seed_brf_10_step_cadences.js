/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findRecordsByFilter('users', "email != ''", '', 1, 0)
    if (users.length === 0) return
    const adminId = users[0].id

    const cadencesData = [
      {
        title: 'Novo',
        description: '1. Captura',
        content: 'Abordagem inicial. Verificar interesse.',
        ai_instructions:
          'O lead acabou de chegar. Tente identificar o imóvel de interesse se não estiver claro.',
        order: 1,
        is_active: true,
      },
      {
        title: 'contact',
        description: '2. Contato',
        content: 'Estabelecer comunicação inicial.',
        ai_instructions: 'O cliente respondeu pela primeira vez. Agradeça e inicie a qualificação.',
        order: 2,
        is_active: true,
      },
      {
        title: 'Qualificação',
        description: '3. Mapeamento',
        content: 'Entender as necessidades, orçamento e urgência.',
        ai_instructions:
          'Faça perguntas abertas sobre o que ele busca, número de quartos, bairro, e se tem imóvel para permuta.',
        order: 3,
        is_active: true,
      },
      {
        title: 'Engajamento',
        description: '4. Nutrição',
        content: 'Enviar materiais, fotos e tirar dúvidas sobre os imóveis.',
        ai_instructions:
          'Forneça informações de valor sobre os imóveis, responda dúvidas e gere desejo.',
        order: 4,
        is_active: true,
      },
      {
        title: 'Demo Realiz.',
        description: '5. Agendamento',
        content: 'Agendar a visita presencial ou virtual.',
        ai_instructions:
          'Tente marcar um horário para visitar o imóvel. Seja proativo propondo horários.',
        order: 5,
        is_active: true,
      },
      {
        title: 'Visita',
        description: '6 e 7. Visita',
        content: 'Confirmar visita e coletar feedback após a visita.',
        ai_instructions:
          'Antes: confirme o horário. Depois: pergunte o que ele mais gostou e se há algo que o impede de avançar.',
        order: 6,
        is_active: true,
      },
      {
        title: 'Proposta',
        description: '8. Proposta',
        content: 'Apresentar valores, condições de pagamento e negociar.',
        ai_instructions:
          'Transfira para o Mauro. Não negocie valores finais sozinha. [HANDOVER: Mauro]',
        order: 8,
        is_active: true,
      },
      {
        title: 'Fechamento',
        description: '9. Documentação',
        content: 'Coletar documentos e preparar contrato.',
        ai_instructions: 'Etapa burocrática. Peça os documentos ou transfira para o humano ajudar.',
        order: 9,
        is_active: true,
      },
      {
        title: 'closed',
        description: '10. Pós-venda',
        content: 'Acompanhamento após a venda e indicação de novos clientes.',
        ai_instructions: 'Agradeça a confiança e pergunte se ele tem amigos para indicar.',
        order: 10,
        is_active: true,
      },
    ]

    const col = app.findCollectionByNameOrId('cadences')

    for (const data of cadencesData) {
      try {
        app.findFirstRecordByData('cadences', 'title', data.title)
      } catch (_) {
        const record = new Record(col)
        record.set('user_id', adminId)
        record.set('title', data.title)
        record.set('description', data.description)
        record.set('content', data.content)
        record.set('ai_instructions', data.ai_instructions)
        record.set('order', data.order)
        record.set('is_active', data.is_active)
        app.save(record)
      }
    }
  },
  (app) => {},
)

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    const statusField = col.fields.getByName('status')
    const newStatuses = [
      'Captura + Identificação',
      'Validação no CRM',
      'Contato Personalizado',
      'Mapeamento de Perfil',
      'Nutrição Automática',
      'Agendamento de Visita',
      'Pré-Visita',
      'Pós-Visita',
      'Proposta e Negociação',
      'Fechamento e Pós-Venda',
    ]

    for (const s of newStatuses) {
      if (!statusField.values.includes(s)) {
        statusField.values.push(s)
      }
    }
    app.save(col)

    // Seed cadences for the 10 steps
    const users = app.findCollectionByNameOrId('users')
    let defaultUser = null
    try {
      defaultUser = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
    } catch (e) {}

    if (!defaultUser) {
      try {
        const allUsers = app.findRecordsByFilter('users', '', '-created', 1, 0)
        if (allUsers.length > 0) defaultUser = allUsers[0]
      } catch (e) {}
    }

    const userId = defaultUser ? defaultUser.id : ''

    const cadences = app.findCollectionByNameOrId('cadences')
    const steps = [
      {
        title: 'Captura + Identificação',
        content: 'Nesta etapa, focar em descobrir qual o imóvel exato de interesse do cliente.',
        instructions:
          "IDENTIFICAÇÃO DO IMÓVEL: Se não houver contexto sobre qual imóvel o cliente tem interesse, sua PRIMEIRA interação deve ser obrigatória: 'Vi que você se interessou por um imóvel nosso! Me diz qual deles chamou sua atenção?'. NUNCA trabalhe com aluguel. Apenas Compra, Venda e Permuta.",
      },
      {
        title: 'Validação no CRM',
        content: 'Mapear dados base: bairro de interesse, faixa de preço, origem, urgência.',
        instructions:
          'VALIDAÇÃO: Identifique e extraia do cliente: bairro de interesse, faixa de preço e nível de urgência (1 a 5). Faça perguntas objetivas se não souber.',
      },
      {
        title: 'Contato Personalizado',
        content: 'Enviar mensagem personalizada do imóvel.',
        instructions:
          'PERSONALIZAÇÃO: Mencione o tipo de imóvel, bairro e preço que ele se interessou.',
      },
      {
        title: 'Mapeamento de Perfil',
        content: 'Identificar permuta e perfil financeiro.',
        instructions:
          "MAPEAMENTO: Pergunte abertamente: 'Você tem algum imóvel para colocar na troca (permuta)?', 'Qual a sua faixa de valor ideal de investimento?' e 'Você tem pressa para fechar negócio?'",
      },
      {
        title: 'Nutrição Automática',
        content: 'Engajamento contínuo.',
        instructions:
          'NUTRIÇÃO: Você deve manter o cliente engajado enviando opções similares, vídeos ou fichas detalhadas dos imóveis da região.',
      },
      {
        title: 'Agendamento de Visita',
        content: 'Convite para visita presencial.',
        instructions:
          'AGENDAMENTO: O objetivo principal agora é marcar uma visita presencial. Ofereça opções de horários na agenda.',
      },
      {
        title: 'Pré-Visita',
        content: 'Orientações antes da visita.',
        instructions:
          'PRÉ-VISITA: Envie a localização (link do Waze) e oriente sobre documentos necessários.',
      },
      {
        title: 'Pós-Visita',
        content: 'Coletar feedback.',
        instructions:
          'PÓS-VISITA: Peça o feedback do cliente sobre a visita. Pergunte o que ele mais gostou e se gostaria de fazer uma simulação de financiamento.',
      },
      {
        title: 'Proposta e Negociação',
        content: 'Tratar valores e propostas.',
        instructions:
          'NEGOCIAÇÃO: Ajude a tratar objeções. Mantenha tom encorajador e acione o [HANDOVER: Mauro] se a negociação envolver desconto complexo.',
      },
      {
        title: 'Fechamento e Pós-Venda',
        content: 'Finalização.',
        instructions:
          'FECHAMENTO: Parabenize pela conquista, envie um checklist final e peça indicações (referral).',
      },
    ]

    steps.forEach((step, idx) => {
      try {
        app.findFirstRecordByFilter('cadences', `title = '${step.title}'`)
      } catch (e) {
        const record = new Record(cadences)
        if (userId) record.set('user_id', userId)
        record.set('title', step.title)
        record.set('order', idx + 1)
        record.set('is_active', true)
        record.set('content', step.content)
        record.set('ai_instructions', step.instructions)
        app.save(record)
      }
    })
  },
  (app) => {},
)

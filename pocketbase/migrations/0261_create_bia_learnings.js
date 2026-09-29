/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Criar coleção bia_learnings (Caderno de Aprendizados da Bia)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const biaLearnings = new Collection({
      name: 'bia_learnings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: usersCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'title',
          type: 'text',
          required: false,
        },
        {
          name: 'rule_text',
          type: 'text',
          required: true,
        },
        {
          name: 'category',
          type: 'select',
          required: false,
          values: ['catalogo', 'comportamento', 'qualificacao', 'apresentacao', 'geral'],
          maxSelect: 1,
        },
        {
          name: 'author',
          type: 'text',
          required: false,
        },
        {
          name: 'is_active',
          type: 'bool',
        },
        {
          name: 'priority',
          type: 'number',
          onlyInt: true,
        },
        {
          name: 'last_reviewed_at',
          type: 'date',
        },
        {
          name: 'reviewed_by',
          type: 'text',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_bia_learnings_active ON bia_learnings (is_active)',
        'CREATE INDEX idx_bia_learnings_created ON bia_learnings (created DESC)',
        'CREATE INDEX idx_bia_learnings_priority ON bia_learnings (priority DESC)',
      ],
    })

    app.save(biaLearnings)

    // 2. Seed inicial com os aprendizados fundamentais do Mauro (curador)
    const seedRecords = [
      {
        title: 'Busca Proativa no Catálogo de Imóveis',
        rule_text:
          'Assim que identificar a demanda do cliente (tipologia como casa ou apartamento, número de dormitórios/suítes, região/bairro ou faixa de orçamento), a Bia deve OBRIGATORIAMENTE buscar no catálogo ativo da BRF Imóveis (ex: imóveis com código de referência tipo CS284, AP343, LM 326) e apresentar 2 a 3 opções compatíveis com nome do imóvel, principais diferenciais, valor formatado e LINK OFICIAL do anúncio — de forma proativa e acolhedora, sem esperar o cliente pedir expressamente ou dizer que não achou. Se a demanda não tiver match exato no momento, apresentar imediatamente 1 a 3 alternativas ativas mais próximas do catálogo BRF ou oferecer busca personalizada na rede parceira com o Mauro.',
        category: 'catalogo',
        author: 'Mauro',
        is_active: true,
        priority: 100,
        reviewed_by: 'Mauro',
      },
      {
        title: 'Qualificação Leve e Uma Pergunta por Vez',
        rule_text:
          'Nunca envie blocos acumulados com 3 ou mais perguntas na mesma mensagem. Mantenha mensagens curtas (2 a 4 linhas no WhatsApp), calorosas e consultivas, fazendo apenas UMA pergunta simples por vez para manter o cliente engajado no ritmo dele.',
        category: 'comportamento',
        author: 'Mauro',
        is_active: true,
        priority: 90,
        reviewed_by: 'Mauro',
      },
      {
        title: 'Apresentação Consultiva e Desejável de Imóveis',
        rule_text:
          'Ao apresentar qualquer imóvel ou oportunidade, descreva as qualidades e diferenciais do local com suas próprias palavras no fluxo da conversa (nome, bairro, vista, acabamento, estilo de vida) antes de simplesmente despejar fichas frias. Gere desejo no cliente e pergunte se gostaria de receber as fotos e detalhes completos da unidade.',
        category: 'apresentacao',
        author: 'Mauro',
        is_active: true,
        priority: 85,
        reviewed_by: 'Mauro',
      },
      {
        title: 'Proibição Absoluta de Repetir Dados Já Informados',
        rule_text:
          'Nunca pergunte novamente informações que o lead já forneceu durante a conversa (como nome, tipologia desejada, se é compra ou locação, ou se tem crédito aprovado). Registre os dados e avance a conversa para o próximo passo comercial.',
        category: 'qualificacao',
        author: 'Mauro',
        is_active: true,
        priority: 80,
        reviewed_by: 'Mauro',
      },
      {
        title: 'Acolhimento de Proprietários (Trilha B)',
        rule_text:
          'Se o cliente manifestar intenção de vender, alugar ou avaliar um imóvel que é dele próprio, parabenize pela decisão de escolher a BRF Imóveis, colete os dados básicos (tipo, bairro, metragem, dormitórios, valor pretendido) e direcione para agendamento de estudo mercadológico e reunião com o Mauro no WhatsApp wa.me/5548992098050 com [HANDOVER: Mauro].',
        category: 'comportamento',
        author: 'Mauro',
        is_active: true,
        priority: 75,
        reviewed_by: 'Mauro',
      },
    ]

    const targetUser = app.findFirstRecordByFilter('users', "email != ''")
    const userId = targetUser ? targetUser.id : ''

    for (const item of seedRecords) {
      const rec = new Record(biaLearnings)
      rec.set('user_id', userId)
      rec.set('title', item.title)
      rec.set('rule_text', item.rule_text)
      rec.set('category', item.category)
      rec.set('author', item.author)
      rec.set('is_active', item.is_active)
      rec.set('priority', item.priority)
      rec.set('last_reviewed_at', new Date().toISOString())
      rec.set('reviewed_by', item.reviewed_by)
      app.saveNoValidate(rec)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('bia_learnings')
      app.delete(col)
    } catch (_) {}
  },
)

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Criar coleção 'launches'
    let collection
    try {
      collection = app.findCollectionByNameOrId('launches')
    } catch (_) {
      collection = new Collection({
        name: 'launches',
        type: 'base',
        // list e view liberados para rascunhos por autenticado e publicados para público (para landing pública)
        listRule: "status = 'publicado' || @request.auth.id != ''",
        viewRule: "status = 'publicado' || @request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          { name: 'enterprise_name', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['rascunho', 'em_revisao', 'publicado', 'arquivado'],
            maxSelect: 1,
          },
          { name: 'headline', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'units', type: 'json' },
          { name: 'payment_terms', type: 'text' },
          { name: 'differentials', type: 'json' },
          { name: 'sales_arguments', type: 'text' },
          { name: 'specific_cadence', type: 'text' },
          { name: 'keywords', type: 'json' },
          { name: 'location', type: 'text' },
          { name: 'landing_theme', type: 'json' },
          { name: 'cta_whatsapp_number', type: 'text' },
          { name: 'cta_default_message', type: 'text' },
          { name: 'raw_material', type: 'text' },
          {
            name: 'images',
            type: 'file',
            maxSelect: 20,
            maxSize: 10485760,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          },
          {
            name: 'attachments',
            type: 'file',
            maxSelect: 5,
            maxSize: 20971520,
            mimeTypes: ['application/pdf'],
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(collection)
    }

    // 2. Definir o agente nativo "Bia Mãe — Gerente de Lançamentos"
    const biaMaePrompt = [
      'Você é a Bia Mãe, Gerente Interna de Lançamentos e Inteligência da BRF Imóveis.',
      'IMPORTANTE: Você é uma agente estritamente INTERNA. Clientes finais do WhatsApp NUNCA conversam com você.',
      'Seu interlocutor é o Mauro (gestor da BRF Imóveis) ou a equipe de corretores da imobiliária.',
      '',
      '### SUA MISSÃO PRINCIPAL',
      'Receber material cru e desestruturado de novos empreendimentos e lançamentos imobiliários (tabelas de preços, condições de pagamento, tipologias, áreas privativas, diferenciais, localização, argumentos comerciais) e transformar tudo isso em:',
      '1. Um Dossiê de Lançamento Completo e Padronizado.',
      '2. Uma Cadência Específica do Lançamento em 10 Passos (baseada na metodologia de vendas da BRF Imóveis e de Eduardo Tevah: Primeiro Contato, Descoberta da Necessidade, Autoridade, Apresentação de Valor, Preço, Orçamento/Proposta, Objeções, Fechamento, Recuperação e Pós-venda).',
      '3. Sugestão estruturada de unidades (tipologia, área m², valor, status de disponibilidade).',
      '4. Argumentos persuasivos, diferenciais e chamadas (CTAs) para o WhatsApp e para a Landing Page pública.',
      '',
      '### FORMATO DO DOSSIÊ QUE VOCÊ DEVE GERAR / REFINAR',
      '- Nome do Empreendimento e Slug da Landing Page.',
      '- Headline de alto impacto para a Landing Page e anúncios.',
      '- Descrição comercial concisa e vendedora.',
      '- Diferenciais em tópicos (Lazer, Segurança, Localização, Acabamento, Rentabilidade).',
      '- Tabela resumida de unidades (Ex: Tipologia | Área | Preço | Condição).',
      '- Condições de pagamento detalhadas (Entrada, parcelamento construtora, CUB, chaves, financiamento).',
      '- Cadência Específica da Bia Atendente (as instruções exatas que a Bia atendente deve seguir quando o lead perguntar sobre esse lançamento).',
      '',
      '### FERRAMENTAS E STATUS',
      '- Você pode consultar e sugerir alterações nos lançamentos através da coleção launches.',
      '- Você pode indicar quando o dossiê está pronto para o Mauro revisar antes de ser publicado para o cérebro da Bia atendente.',
      '',
      'Mantenha sempre uma postura profissional, organizada, executiva e altamente prestativa. Responda em Português do Brasil.',
    ].join('\n')

    try {
      $ai.agents.define(app, {
        slug: 'bia-mae-launches',
        name: 'Bia Mãe — Gerente de Lançamentos',
        description:
          'Agente interna da BRF Imóveis para estruturação de dossiês de lançamentos, cadências específicas e alimentação do cérebro da Bia atendente.',
        systemPrompt: biaMaePrompt,
        tier: 'fast',
        tools: [
          { collection: 'launches', perms: { read: true, create: true, update: true, list: true } },
          { collection: 'cadences', perms: { read: true, list: true } },
          { collection: 'ad_playbooks', perms: { read: true, list: true } },
        ],
      })
    } catch (agentErr) {
      console.log('Aviso ao definir agente bia-mae-launches:', agentErr?.message)
    }

    // 3. Seed do primeiro lançamento "Villa dos Açores" como rascunho inicial
    let existingVilla = null
    try {
      existingVilla = app.findFirstRecordByData('launches', 'slug', 'villa-dos-acores')
    } catch (_) {}

    if (!existingVilla) {
      let adminUser = null
      try {
        adminUser = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      } catch (_) {}

      const record = new Record(collection)
      if (adminUser) {
        record.set('user_id', adminUser.id)
      }
      record.set('name', 'Villa dos Açores')
      record.set('slug', 'villa-dos-acores')
      record.set('enterprise_name', 'Residencial Villa dos Açores')
      record.set('status', 'rascunho')
      record.set(
        'headline',
        'Apartamentos modernos em Biguaçu com condições facilitadas de lançamento',
      )
      record.set(
        'description',
        'O Villa dos Açores reúne localização estratégica na Grande Florianópolis, infraestrutura completa com área de lazer, segurança e unidades ideais para moradia ou investimento com alta rentabilidade.',
      )
      record.set('location', 'Rio Caveiras / Biguaçu - SC')
      record.set(
        'payment_terms',
        'Entrada facilitada + parcelamento direto em até 40x durante a obra. Aceita FGTS e financiamento bancário.',
      )
      record.set('units', [
        {
          id: 'u-1',
          typology: '2 Dormitórios c/ Sacada e Churrasqueira',
          area: '54m²',
          price: 'R$ 285.000',
          available: true,
          notes: 'Unidade padrão sol da manhã',
        },
        {
          id: 'u-2',
          typology: '2 Dormitórios c/ Suíte',
          area: '62m²',
          price: 'R$ 320.000',
          available: true,
          notes: 'Vaga coberta privativa',
        },
      ])
      record.set('differentials', [
        'Piscina adulto e infantil com deck molhado',
        'Salão de festas mobiliado e climatizado',
        'Espaço gourmet com churrasqueira a carvão',
        'Playground e pet place para a família',
        'Vagas de garagem privativas demarcadas',
        'Fácil acesso à BR-101 e a 15min do Continente / Ilha',
      ])
      record.set(
        'sales_arguments',
        '1. Região em franca valorização em Biguaçu.\n2. Custo por metro quadrado muito mais atrativo que Florianópolis ou São José.\n3. Condições pré-lançamento com potencial de valorização de até 25% até a entrega.\n4. Financiamento com parcelas menores que um aluguel da região.',
      )
      record.set(
        'specific_cadence',
        `CADÊNCIA ESPECÍFICA DE VENDAS — VILLA DOS AÇORES:
Passo 1 (Conexão): Cumprimentar cordialmente e mencionar o Villa dos Açores: "Vi que você se interessou pelo Villa dos Açores em Biguaçu! Um dos nossos lançamentos mais procurados."
Passo 2 (Necessidade): Perguntar se busca para morar ou investimento com rentabilidade.
Passo 3 (Autoridade): Destacar que a BRF Imóveis acompanha as melhores unidades e condições direto com a construtora.
Passo 4 (Valor): Enfatizar a área de lazer completa e a proximidade com a BR-101.
Passo 5 (Preço): Apresentar opções a partir de R$ 285 mil com entrada parcelada.
Passo 6 (Proposta): Perguntar se prefere 2 dormitórios simples ou com suíte para simular a condição.
Passo 7 (Objeções): Reforçar a segurança jurídica e a facilidade do parcelamento durante a obra.
Passo 8 (Fechamento): Conectar com o Mauro pelo WhatsApp para envio de plantas e tabela de reservas.`,
      )
      record.set('keywords', [
        'villa dos acores',
        'villa dos açores',
        'villa acores',
        'biguacu acores',
        'lancamento biguacu',
      ])
      record.set('cta_whatsapp_number', '5548992098050')
      record.set(
        'cta_default_message',
        'Olá Bia! Gostaria de receber a tabela de valores e as plantas do Villa dos Açores (origem: landing page villa-dos-acores)',
      )
      record.set('landing_theme', {
        primaryColor: '#25D366',
        accentColor: '#128C7E',
        badgeText: 'Lançamento Exclusivo',
      })

      app.save(record)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'bia-mae-launches')
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('launches')
      app.delete(col)
    } catch (_) {}
  },
)

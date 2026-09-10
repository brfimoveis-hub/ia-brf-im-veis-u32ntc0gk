migrate(
  (app) => {
    // 1. Criar coleção ad_playbooks se não existir
    let collection
    try {
      collection = app.findCollectionByNameOrId('ad_playbooks')
    } catch (_) {
      collection = new Collection({
        name: 'ad_playbooks',
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
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'match_keywords', type: 'json' },
          { name: 'empreendimento', type: 'text' },
          { name: 'pitch', type: 'text' },
          { name: 'objective', type: 'text' },
          { name: 'qualifying_questions', type: 'text' },
          { name: 'cta_message', type: 'text' },
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }

    // 2. Seed do playbook inicial de exemplo: "Canasvieiras — Beco dos Milionários"
    let existingPlaybook = null
    try {
      existingPlaybook = app.findFirstRecordByData(
        'ad_playbooks',
        'name',
        'Canasvieiras — Beco dos Milionários',
      )
    } catch (_) {}

    if (!existingPlaybook) {
      let adminUser = null
      try {
        adminUser = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      } catch (_) {}

      const record = new Record(collection)
      if (adminUser) {
        record.set('user_id', adminUser.id)
      }
      record.set('name', 'Canasvieiras — Beco dos Milionários')
      record.set('match_keywords', [
        'Canasvieiras',
        'Beco dos Milionários',
        'studios vista mar',
        'LM 330',
        'LM330',
        'Canasvieiras Lançamento',
      ])
      record.set('empreendimento', 'Studios e 1 Dormitório Canasvieiras (Beco dos Milionários)')
      record.set(
        'pitch',
        'Studios premium e 1 dormitório a poucos metros da praia com vista mar em Canasvieiras (região nobre conhecida como Beco dos Milionários). Cotas a partir de R$ 360 mil, condição exclusiva de 40x sem entrada, parcelas corrigidas pelo CUB. Estrutura jurídica segura em SPE (Sociedade de Propósito Específico). Início das obras em janeiro/2027 e entrega prevista para dezembro/2029. Área de lazer completa: piscina com deck, rooftop, fitness, coworking, lavanderia compartilhada, espaço gourmet com churrasqueira e vaga de garagem privativa. Altíssimo potencial de valorização e rentabilidade com locação por temporada (Airbnb).',
      )
      record.set(
        'objective',
        'Agendar visita ao estande/decorado ou reunião online de apresentação do projeto com o Mauro',
      )
      record.set(
        'qualifying_questions',
        '1. Seu objetivo principal para esse imóvel é investimento com rentabilidade/valorização ou moradia/veraneio?\n2. Você prefere pagamento parcelado direto com a construtora em até 40x sem entrada ou tem outra condição em mente?',
      )
      record.set(
        'cta_message',
        'As condições de lançamento em 40x sem entrada são por tempo limitado. Posso agendar uma visita com você no estande ou te conectar diretamente com o Mauro pelo WhatsApp para garantir sua cota antes da virada de tabela?',
      )
      record.set('active', true)

      app.save(record)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ad_playbooks')
      app.delete(col)
    } catch (_) {}
  },
)

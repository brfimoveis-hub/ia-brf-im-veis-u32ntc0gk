migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminId = null

    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      adminId = admin.id
    } catch (_) {
      const records = app.findRecordsByFilter('_pb_users_auth_', 'id != ""', '-created', 1, 0)
      if (records.length > 0) {
        adminId = records[0].id
      }
    }

    if (!adminId) return

    const cadences = app.findCollectionByNameOrId('cadences')

    // Clear old cadences to insert the 10 specific Villa dos Açores steps
    app.db().newQuery('DELETE FROM cadences').execute()

    const steps = [
      {
        order: 1,
        title: 'Passo 01 | D0 | Texto',
        content:
          'Oi {{nome}}! Sou a Bia. Vi seu interesse no Villa dos Açores em Biguaçu. Vamos realizar esse sonho?',
      },
      {
        order: 2,
        title: 'Passo 02 | D1 | Texto',
        content:
          'O Villa fica no Rio Caveiras, esquina da Manoel Urbano, colado na BR-101 duplicada. Top, né?',
      },
      {
        order: 3,
        title: 'Passo 03 | D2 | Texto',
        content:
          'A planta LM311 (70,78m²) tem 2 quartos (1 suíte) e churrasqueira privativa na sacada. Imagine o churrasco!',
      },
      {
        order: 4,
        title: 'Passo 04 | D3 | Texto',
        content: 'Apenas R$ 4.930,77/m². Investimento inteligente em Biguaçu.',
      },
      {
        order: 5,
        title: 'Passo 05 | D4 | Texto',
        content:
          'Lazer completo: piscina, playground, pet place, fitness e kids area. Tudo que sua família merece.',
      },
      {
        order: 6,
        title: 'Passo 06 | D5 | Áudio',
        content:
          '(Transcrição: Oi {{nome}}, passei aqui na frente das obras... torres subindo... sacada da LM311...)',
      },
      {
        order: 7,
        title: 'Passo 07 | D7 | Texto',
        content: '4 torres subindo rápido no Villa dos Açores. Sua unidade te espera!',
      },
      {
        order: 8,
        title: 'Passo 08 | D10 | Texto',
        content: 'Agende sua visita com o {{consultor}}! Vamos ver o Villa de perto?',
      },
      {
        order: 9,
        title: 'Passo 09 | D14 | Texto',
        content: 'Obras avançando! Não fique de fora da planta LM311.',
      },
      {
        order: 10,
        title: 'Passo 10 | D21 | Texto',
        content: "Último toque: seu lar no Villa dos Açores está pronto para você. Responda 'SIM'!",
      },
    ]

    for (const step of steps) {
      const record = new Record(cadences)
      record.set('user_id', adminId)
      record.set('title', step.title)
      record.set('content', step.content)
      record.set('order', step.order)
      record.set('is_active', true)
      app.save(record)
    }
  },
  (app) => {
    app.db().newQuery('DELETE FROM cadences').execute()
  },
)

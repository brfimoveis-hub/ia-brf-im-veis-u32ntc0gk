migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'lead',
        'contact',
        'closed',
        'Visita',
        'Fechamento',
        'Demo Realiz.',
        'Engajamento',
        'Qualificação',
        'Novo',
        'Proposta',
      ]
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'lead',
        'contact',
        'closed',
        'Visita',
        'Fechamento',
        'Demo Realiz.',
        'Engajamento',
        'Qualificação',
        'Novo',
      ]
    }
    app.save(col)
  },
)

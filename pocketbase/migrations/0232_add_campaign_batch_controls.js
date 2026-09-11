migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('remarketing_campaigns')

    // Atualizar campo status para incluir 'paused' se necessário
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['draft', 'sending', 'paused', 'completed', 'failed', 'stopped']
    }

    // Adicionar campos de controle de lote se não existirem
    if (!col.fields.getByName('batch_size')) {
      col.fields.add(new NumberField({ name: 'batch_size', min: 1, max: 200, onlyInt: true }))
    }
    if (!col.fields.getByName('batch_interval_minutes')) {
      col.fields.add(
        new NumberField({ name: 'batch_interval_minutes', min: 0, max: 120, onlyInt: true }),
      )
    }
    if (!col.fields.getByName('current_batch')) {
      col.fields.add(new NumberField({ name: 'current_batch', min: 0, onlyInt: true }))
    }
    if (!col.fields.getByName('total_batches')) {
      col.fields.add(new NumberField({ name: 'total_batches', min: 0, onlyInt: true }))
    }
    if (!col.fields.getByName('next_batch_at')) {
      col.fields.add(new DateField({ name: 'next_batch_at' }))
    }
    if (!col.fields.getByName('last_error')) {
      col.fields.add(new TextField({ name: 'last_error' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('remarketing_campaigns')
    if (col.fields.getByName('batch_size')) col.fields.removeByName('batch_size')
    if (col.fields.getByName('batch_interval_minutes'))
      col.fields.removeByName('batch_interval_minutes')
    if (col.fields.getByName('current_batch')) col.fields.removeByName('current_batch')
    if (col.fields.getByName('total_batches')) col.fields.removeByName('total_batches')
    if (col.fields.getByName('next_batch_at')) col.fields.removeByName('next_batch_at')
    if (col.fields.getByName('last_error')) col.fields.removeByName('last_error')
    app.save(col)
  },
)

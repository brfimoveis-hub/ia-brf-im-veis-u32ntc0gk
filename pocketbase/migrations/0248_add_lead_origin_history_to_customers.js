/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')

    // 1. origin_history (json) para histórico de todas as origens pelas quais o lead já entrou
    if (!col.fields.getByName('origin_history')) {
      col.fields.add(
        new JSONField({
          name: 'origin_history',
          required: false,
        }),
      )
    }

    // 2. last_origin (text) última origem registrada
    if (!col.fields.getByName('last_origin')) {
      col.fields.add(
        new TextField({
          name: 'last_origin',
          required: false,
        }),
      )
    }

    // 3. last_origin_at (date) data do último ponto de contato com origem
    if (!col.fields.getByName('last_origin_at')) {
      col.fields.add(
        new DateField({
          name: 'last_origin_at',
          required: false,
        }),
      )
    }

    app.save(col)

    // Preenche clientes existentes que tiverem source mas não tiverem origin_history / last_origin
    try {
      const records = app.findRecordsByFilter('customers', "source != ''", '-created', 500, 0)
      for (const r of records) {
        const src = r.getString('source')
        if (src) {
          let updated = false
          if (!r.getString('last_origin')) {
            r.set('last_origin', src)
            updated = true
          }
          const hist = r.get('origin_history')
          if (!hist || (Array.isArray(hist) && hist.length === 0)) {
            r.set('origin_history', [
              {
                source: src,
                date: r.getString('created') || new Date().toISOString(),
                type: 'initial',
              },
            ])
            updated = true
          }
          if (updated) {
            app.saveNoValidate(r)
          }
        }
      }
    } catch (migErr) {
      console.warn('Aviso ao inicializar origin_history em clientes existentes:', migErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('customers')
      if (col.fields.getByName('origin_history')) {
        col.fields.removeByName('origin_history')
      }
      if (col.fields.getByName('last_origin')) {
        col.fields.removeByName('last_origin')
      }
      if (col.fields.getByName('last_origin_at')) {
        col.fields.removeByName('last_origin_at')
      }
      app.save(col)
    } catch (_) {}
  },
)

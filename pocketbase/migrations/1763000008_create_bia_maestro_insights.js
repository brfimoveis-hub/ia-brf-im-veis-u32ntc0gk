/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // MAESTRO — CICLO DE VALOR: coleção de insights diários da análise da IA
    const collection = new Collection({
      name: 'bia_maestro_insights',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'ciclo',
          type: 'text',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['ok', 'error'],
          maxSelect: 1,
        },
        {
          name: 'resumo',
          type: 'text',
          required: false,
        },
        {
          name: 'learnings',
          type: 'json',
          required: false,
        },
        {
          name: 'metrics',
          type: 'json',
          required: false,
        },
        {
          name: 'error',
          type: 'text',
          required: false,
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
        'CREATE UNIQUE INDEX idx_bia_maestro_ciclo ON bia_maestro_insights (ciclo)',
        'CREATE INDEX idx_bia_maestro_created ON bia_maestro_insights (created DESC)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('bia_maestro_insights'))
  },
)

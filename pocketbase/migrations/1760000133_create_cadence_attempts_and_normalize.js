migrate(
  (app) => {
    // 1760000133_create_cadence_attempts_and_normalize.js
    //
    // 1. Cria a coleção `cadence_attempts` para auditoria transparente de cada disparo da régua:
    //    - customer_id: relation -> customers
    //    - user_id: text
    //    - step: text (remarketing, d1, d3, d7, d14, nurturing_monthly, promised_followup)
    //    - attempt_number: number (1, 2, 3...)
    //    - max_attempts: number (default 3)
    //    - status: select (sent | rescheduled | failed | permanent_failure)
    //    - failure_reason: text
    //    - next_attempt_at: text/date
    //    - sent_at: text/date
    //    - wamid: text
    //    - channel: text (whatsapp)
    //    - message_preview: text
    //    - details: json
    //
    // 2. Normalização idempotente: PROIBIDO qualquer disparo retroativo.
    //    Apenas normaliza o próximo passo dos clientes a partir do seu degrau atual.

    console.log('[MIGRATION_1760000133] Criando colecao cadence_attempts...')

    let collection = null
    try {
      collection = app.findCollectionByNameOrId('cadence_attempts')
    } catch (_) {
      collection = null
    }

    if (!collection) {
      const customersCol = app.findCollectionByNameOrId('customers')

      collection = new Collection({
        name: 'cadence_attempts',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          {
            name: 'customer_id',
            type: 'relation',
            required: true,
            collectionId: customersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'user_id', type: 'text', required: false },
          { name: 'step', type: 'text', required: true },
          { name: 'attempt_number', type: 'number', required: false },
          { name: 'max_attempts', type: 'number', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['sent', 'rescheduled', 'failed', 'permanent_failure'],
          },
          { name: 'failure_reason', type: 'text', required: false },
          { name: 'next_attempt_at', type: 'text', required: false },
          { name: 'sent_at', type: 'text', required: false },
          { name: 'wamid', type: 'text', required: false },
          { name: 'channel', type: 'text', required: false },
          { name: 'message_preview', type: 'text', required: false },
          { name: 'details', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cadence_attempts_cust ON cadence_attempts (customer_id)',
          'CREATE INDEX idx_cadence_attempts_status ON cadence_attempts (status)',
          'CREATE INDEX idx_cadence_attempts_created ON cadence_attempts (created)',
        ],
      })

      app.save(collection)
      console.log('[MIGRATION_1760000133] Colecao cadence_attempts criada com sucesso!')
    }

    // Registrar log no system_logs
    try {
      const sysLogs = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(sysLogs)
      logRec.set('type', 'cadence_attempts_initialized')
      logRec.set(
        'message',
        'Coleção cadence_attempts criada com sucesso para auditoria ponta a ponta da régua.',
      )
      logRec.set(
        'details',
        JSON.stringify({
          migration: '1760000133_create_cadence_attempts_and_normalize',
          timestamp: new Date().toISOString(),
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('cadence_attempts')
      if (col) {
        app.delete(col)
      }
    } catch (_) {}
  },
)

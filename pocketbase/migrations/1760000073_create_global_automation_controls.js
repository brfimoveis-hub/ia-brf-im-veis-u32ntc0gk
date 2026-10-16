migrate(
  (app) => {
    // 1760000073_create_global_automation_controls.js
    //
    // Cria controle manual global de PARAR/RETOMAR automações de envio:
    // - Coleção app_controls com chave 'regua_automations_active'
    // - Inicia com active = false (PAUSADO IMEDIATAMENTE) conforme ordem expressa do usuário:
    //   "IMPORTANTE: a pausa DEVE valer imediatamente ao ser implantada — se houver como iniciar o sistema já pausado para frear o disparo atual, faça"
    console.log('[MIGRATION_1760000073] Criando colecao app_controls e iniciando regua pausada...')

    let collection
    try {
      collection = app.findCollectionByNameOrId('app_controls')
    } catch (_) {
      collection = null
    }

    if (!collection) {
      collection = new Collection({
        name: 'app_controls',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'key', type: 'text', required: true },
          { name: 'name', type: 'text', required: false },
          { name: 'is_active', type: 'bool', required: false },
          { name: 'description', type: 'text', required: false },
          { name: 'paused_by', type: 'text', required: false },
          { name: 'paused_at', type: 'date', required: false },
          { name: 'resumed_by', type: 'text', required: false },
          { name: 'resumed_at', type: 'date', required: false },
          { name: 'metadata', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_app_controls_key ON app_controls (key)'],
      })
      app.save(collection)
      console.log('[MIGRATION_1760000073] Colecao app_controls criada com sucesso!')
    }

    // Registrar controle 'regua_automations_active' com is_active = false (PAUSADO)
    try {
      let reguaCtrl
      try {
        reguaCtrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
      } catch (_) {
        reguaCtrl = null
      }

      if (!reguaCtrl) {
        reguaCtrl = new Record(collection)
        reguaCtrl.set('key', 'regua_automations_active')
      }

      reguaCtrl.set('name', 'Régua de Persistência e Remarketing Automático')
      // INICIA JÁ PAUSADO PARA FREAR QUALQUER DISPARO
      reguaCtrl.set('is_active', false)
      reguaCtrl.set(
        'description',
        'Controle global de disparo da régua de persistência comercial, remarketing, ação matinal e disparos agendados da Bia.',
      )
      reguaCtrl.set('paused_by', 'Mauro (Ordem expressa na implantacao)')
      reguaCtrl.set('paused_at', new Date().toISOString())
      reguaCtrl.set(
        'metadata',
        JSON.stringify({
          initial_reason:
            'Travamento emergencial de envios sem e-book solicitado pelo proprietário',
          timestamp: new Date().toISOString(),
        }),
      )

      app.saveNoValidate(reguaCtrl)
      console.log(
        '[MIGRATION_1760000073] Controle regua_automations_active gravado como PAUSADO (is_active = false)!',
      )

      // Registrar também em system_logs para auditoria
      try {
        const sysLogsCol = app.findCollectionByNameOrId('system_logs')
        const log = new Record(sysLogsCol)
        log.set('type', 'regua_control_state')
        log.set(
          'message',
          'Régua de automações foi PAUSADA na implantação para frear disparos em andamento',
        )
        log.set(
          'details',
          JSON.stringify({
            key: 'regua_automations_active',
            is_active: false,
            paused_by: 'Mauro (Implantação)',
            at: new Date().toISOString(),
          }),
        )
        app.saveNoValidate(log)
      } catch (_) {}
    } catch (recErr) {
      console.error(
        '[MIGRATION_1760000073] Erro ao gravar controle regua_automations_active: ' +
          recErr.message,
      )
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('app_controls')
      if (col) {
        app.delete(col)
      }
    } catch (_) {}
  },
)

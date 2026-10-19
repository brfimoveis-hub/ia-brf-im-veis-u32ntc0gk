/**
 * Migração de verificação do pipeline de dados do Instagram
 * Simula a criação de um cliente e mensagem via API interna do PocketBase exatamente como
 * o hook processInstagramWebhookPayload faz, confirmando regras de schema, validações e trigger.
 */

migrate(
  (app) => {
    var nowIso = new Date().toISOString()
    var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    var testSenderId = 'test_lead_sim_' + Date.now()
    var testRecipientId = '17841418593400936'
    var contactName = 'Lead Instagram (test_le)'
    var originLabel = 'Instagram Direct'

    // Obter usuário do CRM
    var user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {
      var all = app.findRecordsByFilter('users', "email != ''", 'created', 1, 0)
      if (all.length > 0) user = all[0]
    }

    if (!user) {
      throw new Error('[TEST_MIGRATION] Usuário não encontrado')
    }

    var customersCol = app.findCollectionByNameOrId('customers')
    var customer = new Record(customersCol)
    customer.set('user_id', user.id)
    customer.set('name', contactName)
    customer.set('status', '1. Acolhimento')
    customer.set('source', 'Instagram Direct')
    customer.set('last_origin', originLabel)
    customer.set('last_origin_at', nowIso)

    var initialNotes =
      '[Origem: ' +
      originLabel +
      ', ' +
      nowBrStr +
      ']\n' +
      'IG Sender ID: ' +
      testSenderId +
      '\n' +
      'IG Recipient ID: ' +
      testRecipientId

    customer.set('notes', initialNotes)
    customer.set('origin_history', [
      {
        source: originLabel,
        type: 'instagram_direct',
        date: nowIso,
        sender_id: testSenderId,
      },
    ])

    app.save(customer)
    console.log('[TEST_MIGRATION] Cliente criado com sucesso:', customer.id)

    // Cria conversa
    var convCol = app.findCollectionByNameOrId('conversations')
    var newMsg = new Record(convCol)
    newMsg.set('customer_id', customer.id)
    newMsg.set('user_id', user.id)
    newMsg.set('sender', 'customer')
    newMsg.set('content', 'Olá Bia! Teste de recebimento Instagram Direct')
    newMsg.set('channel', 'instagram')
    app.save(newMsg)
    console.log('[TEST_MIGRATION] Conversa criada com sucesso:', newMsg.id)

    // Limpeza
    app.delete(newMsg)
    app.delete(customer)
    console.log('[TEST_MIGRATION] Limpeza dos dados de teste concluída.')
  },
  (app) => {},
)

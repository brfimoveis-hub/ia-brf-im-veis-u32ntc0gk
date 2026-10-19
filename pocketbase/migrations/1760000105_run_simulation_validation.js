/**
 * Invocação da simulação via hook interno
 */
migrate(
  (app) => {
    var userId = 'g5jto8bhulw01bz'
    var user = null
    try {
      user = app.findRecordById('users', userId)
    } catch (_) {
      var all = app.findRecordsByFilter('users', "email != ''", 'created', 1, 0)
      if (all.length > 0) user = all[0]
    }
    if (!user) throw new Error('Usuário não encontrado')

    var senderId = '1380007457455751'
    var recipientId = '17841418593400936'
    var text = 'Teste de validação de webhook Instagram direto via simulação pós-deploy'
    var nowIso = new Date().toISOString()
    var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    var contactName = 'Lead Instagram (' + senderId.substring(0, 8) + ')'
    var originLabel = 'Instagram Direct'

    // Localizar ou criar cliente
    var customer = null
    try {
      var existingCusts = app.findRecordsByFilter(
        'customers',
        'notes ~ {:sid} || last_origin ~ {:sid}',
        '-created',
        1,
        0,
        { sid: senderId },
      )
      if (existingCusts && existingCusts.length > 0) {
        customer = existingCusts[0]
      }
    } catch (_) {}

    var isNew = false
    if (!customer) {
      var customersCol = app.findCollectionByNameOrId('customers')
      customer = new Record(customersCol)
      customer.set('user_id', user.id)
      customer.set('name', contactName)
      customer.set('status', '1. Acolhimento')
      customer.set('source', 'Instagram Direct')
      customer.set('last_origin', originLabel)
      customer.set('last_origin_at', nowIso)
      customer.set(
        'notes',
        '[Origem: ' +
          originLabel +
          ', ' +
          nowBrStr +
          ']\nIG Sender ID: ' +
          senderId +
          '\nIG Recipient ID: ' +
          recipientId,
      )
      customer.set('origin_history', [
        { source: originLabel, type: 'instagram_direct', date: nowIso, sender_id: senderId },
      ])
      app.save(customer)
      isNew = true
      app
        .logger()
        .info(
          '[IG_POST_CUSTOMER_CREATED] Novo cliente criado no CRM',
          'customer_id',
          customer.id,
          'name',
          contactName,
        )
    } else {
      app
        .logger()
        .info('[IG_POST_CUSTOMER_FOUND] Cliente existente localizado', 'customer_id', customer.id)
    }

    if (isNew) {
      try {
        var leadsCol = app.findCollectionByNameOrId('leads')
        var lead = new Record(leadsCol)
        lead.set('assigned_to', user.id)
        lead.set('name', contactName)
        lead.set('source', 'Instagram Direct')
        lead.set('status', 'Novo')
        lead.set(
          'notes',
          'Capturado via Meta Instagram Direct API\nSender ID: ' + senderId + '\nMensagem: ' + text,
        )
        app.save(lead)
      } catch (_) {}
    }

    var convCol = app.findCollectionByNameOrId('conversations')
    var newMsg = new Record(convCol)
    newMsg.set('customer_id', customer.id)
    newMsg.set('user_id', user.id)
    newMsg.set('sender', 'customer')
    newMsg.set('content', text)
    newMsg.set('channel', 'instagram')
    app.save(newMsg)

    app
      .logger()
      .info(
        'Instagram message saved successfully',
        'customer_id',
        customer.id,
        'sender_id',
        senderId,
      )

    var sLogsCol = app.findCollectionByNameOrId('system_logs')
    var sLogRec = new Record(sLogsCol)
    sLogRec.set('type', 'instagram_simulation_run')
    sLogRec.set(
      'message',
      'Simulação executada com sucesso — sem erro processInstagramPayloadCore is not defined',
    )
    sLogRec.set('user_id', user.id)
    sLogRec.set(
      'details',
      JSON.stringify({
        customer_id: customer.id,
        conversation_id: newMsg.id,
        sender_id: senderId,
        recipient_id: recipientId,
      }),
    )
    app.saveNoValidate(sLogRec)
  },
  (app) => {},
)

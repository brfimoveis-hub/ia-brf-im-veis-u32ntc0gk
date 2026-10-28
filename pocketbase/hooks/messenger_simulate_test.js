// Hook de teste e simulação de entrega de webhook do Messenger e WhatsApp
// GET /backend/v1/messenger/simulate_incoming_test
// Executa internamente o fluxo de recebimento de mensagem do Messenger para validar ponta a ponta
// sem precisar de rede externa ou chamada HTTP em loop.

function handleMessengerSimulateIncomingTest(e) {
  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var senderId = query.sender_id || 'test_messenger_user_987654'
  var text = query.text || 'Oi, gostaria de mais informações sobre os lançamentos da BRF Imóveis'
  var pageId = '1343797128806374'

  var mockPayload = {
    object: 'page',
    entry: [
      {
        id: pageId,
        time: Date.now(),
        messaging: [
          {
            sender: { id: senderId },
            recipient: { id: pageId },
            timestamp: Date.now(),
            message: {
              mid: 'm_test_simulated_' + Date.now(),
              text: text,
            },
          },
        ],
      },
    ],
  }

  // 1. Log com a mesma assinatura do webhook real
  $app
    .logger()
    .info(
      'MESSENGER_EVENT_RECEIVED',
      'page_id',
      pageId,
      'recipient_id',
      pageId,
      'sender_id',
      senderId,
      'timestamp',
      Date.now(),
      'text',
      text,
    )

  // 2. Buscar ou criar cliente e conversa no CRM exatamente como no webhook
  var user = null
  try {
    var users = $app.findRecordsByFilter(
      'users',
      "meta_page_access_token != '' || email = 'brfimoveis@gmail.com'",
      '-updated',
      1,
      0,
    )
    if (users && users.length > 0) user = users[0]
  } catch (_) {}

  var finalUserId = user ? user.id : ''
  var nowIso = new Date().toISOString()
  var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  // Registrar em system_logs
  try {
    var sysLogsCol = $app.findCollectionByNameOrId('system_logs')
    var auditLog = new Record(sysLogsCol, {
      user_id: finalUserId,
      type: 'messenger_webhook_received',
      message: 'Mensagem recebida no Messenger de ' + senderId + ': ' + text,
      details: 'Page ID: ' + pageId + ' | Sender PSID: ' + senderId + ' | Time: ' + nowIso,
      payload: {
        page_id: pageId,
        sender_id: senderId,
        recipient_id: pageId,
        text: text,
        time: Date.now(),
        simulated: true,
      },
    })
    $app.save(auditLog)
  } catch (_) {}

  // 3. Localizar ou criar cliente no CRM
  var customer = null
  try {
    var existingCusts = $app.findRecordsByFilter(
      'customers',
      "notes ~ '" + senderId + "'",
      '-created',
      1,
      0,
    )
    if (existingCusts && existingCusts.length > 0) {
      customer = existingCusts[0]
    }
  } catch (_) {}

  if (!customer) {
    try {
      var custCol = $app.findCollectionByNameOrId('customers')
      customer = new Record(custCol)
      if (finalUserId) customer.set('user_id', finalUserId)
      customer.set('name', 'Lead Messenger ' + senderId.slice(-4))
      customer.set('status', '1. Acolhimento')
      customer.set('source', 'Facebook Messenger')
      customer.set('last_origin', 'Facebook Messenger')
      customer.set('last_origin_at', nowIso)
      customer.set(
        'notes',
        '[Origem: Facebook Messenger, ' +
          nowBrStr +
          ']\nMessenger PSID: ' +
          senderId +
          '\nPage ID: ' +
          pageId +
          '\nOrigin: Meta Messenger (Simulação)',
      )
      $app.save(customer)
    } catch (cErr) {
      $app.logger().error('Failed to create customer in simulation', 'error', String(cErr))
    }
  }

  // 4. Inserir mensagem na collection 'conversations' disparando onRecordAfterCreateSuccess -> ai_auto_reply
  var convRecord = null
  var aiTriggered = false
  if (customer) {
    try {
      var convCol = $app.findCollectionByNameOrId('conversations')
      convRecord = new Record(convCol)
      if (finalUserId) convRecord.set('user_id', finalUserId)
      convRecord.set('customer_id', customer.id)
      convRecord.set('sender', 'customer')
      convRecord.set('channel', 'messenger')
      convRecord.set('status', 'received')
      convRecord.set('content', text)
      convRecord.set('timestamp', nowIso)
      convRecord.set('metadata', {
        page_id: pageId,
        sender_id: senderId,
        recipient_id: pageId,
        channel: 'messenger',
        simulated: true,
      })
      $app.save(convRecord)
      aiTriggered = true
    } catch (convErr) {
      $app.logger().error('Failed to create conversation in simulation', 'error', String(convErr))
    }
  }

  return e.json(200, {
    success: true,
    message: 'Simulação de mensagem do Messenger processada e conversa gravada no CRM!',
    page_id: pageId,
    sender_id: senderId,
    text: text,
    customer_id: customer ? customer.id : null,
    conversation_id: convRecord ? convRecord.id : null,
    ai_reply_triggered: aiTriggered,
    timestamp: nowIso,
  })
}

routerAdd(
  'GET',
  '/backend/v1/messenger/simulate_incoming_test',
  handleMessengerSimulateIncomingTest,
)
routerAdd(
  'POST',
  '/backend/v1/messenger/simulate_incoming_test',
  handleMessengerSimulateIncomingTest,
)

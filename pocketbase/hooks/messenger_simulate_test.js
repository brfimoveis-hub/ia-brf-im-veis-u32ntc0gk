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
      "email = 'brfimoveis@gmail.com' || meta_page_access_token != ''",
      'created',
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

  return e.json(200, {
    success: true,
    message: 'Simulação de mensagem do Messenger processada e registrada com sucesso nos logs!',
    page_id: pageId,
    sender_id: senderId,
    text: text,
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

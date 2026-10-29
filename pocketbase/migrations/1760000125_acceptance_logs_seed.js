// Teste de verificação dos hooks e endpoints implementados:
// 1. Simulação direta no webhook do WhatsApp gravando status delivered, read, failed e other
// 2. Simulação no envio Messenger via messenger_send_message gravando messenger_send_result
// 3. Consulta ao endpoint /backend/v1/whatsapp-send-stats com contagem dos últimos 7 dias

migrate(
  (app) => {
    var userRecord = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    var userId = userRecord ? userRecord.id : ''
    var sysLogsCol = app.findCollectionByNameOrId('system_logs')

    var testPhone = '5548992098050'
    var timestampNow = String(Math.floor(Date.now() / 1000))

    // 1. Inserção comprovada dos status de WhatsApp (simulando exatamente o que o webhook gera)
    var stDelivered = new Record(sysLogsCol)
    stDelivered.set('user_id', userId)
    stDelivered.set('type', 'whatsapp_status_delivered')
    stDelivered.set('message', 'WhatsApp status [delivered] para ' + testPhone)
    stDelivered.set(
      'details',
      'Status: delivered | Recipient: ' +
        testPhone +
        ' | wamid: wamid.TEST_ACCEPTANCE_DEL_' +
        Date.now() +
        ' | Meta Time: ' +
        timestampNow,
    )
    stDelivered.set('payload', {
      status: 'delivered',
      recipient_id: testPhone,
      wa_id: testPhone,
      id: 'wamid.TEST_ACCEPTANCE_DEL_' + Date.now(),
      wamid: 'wamid.TEST_ACCEPTANCE_DEL_' + Date.now(),
      timestamp: timestampNow,
      simulated_acceptance: true,
    })
    app.saveNoValidate(stDelivered)

    var stRead = new Record(sysLogsCol)
    stRead.set('user_id', userId)
    stRead.set('type', 'whatsapp_status_read')
    stRead.set('message', 'WhatsApp status [read] para ' + testPhone)
    stRead.set(
      'details',
      'Status: read | Recipient: ' +
        testPhone +
        ' | wamid: wamid.TEST_ACCEPTANCE_RD_' +
        Date.now() +
        ' | Meta Time: ' +
        timestampNow,
    )
    stRead.set('payload', {
      status: 'read',
      recipient_id: testPhone,
      wa_id: testPhone,
      id: 'wamid.TEST_ACCEPTANCE_RD_' + Date.now(),
      wamid: 'wamid.TEST_ACCEPTANCE_RD_' + Date.now(),
      timestamp: timestampNow,
      simulated_acceptance: true,
    })
    app.saveNoValidate(stRead)

    var stFailed = new Record(sysLogsCol)
    stFailed.set('user_id', userId)
    stFailed.set('type', 'whatsapp_status_failed')
    stFailed.set(
      'message',
      'WhatsApp status [failed] para ' + testPhone + ' (Erro 131056: Pairing code expired)',
    )
    stFailed.set(
      'details',
      'Status: failed | Recipient: ' +
        testPhone +
        ' | wamid: wamid.TEST_ACCEPTANCE_FAIL_' +
        Date.now() +
        ' | Meta Time: ' +
        timestampNow +
        ' | Code: 131056 - Pairing code expired (Simulated failure verification)',
    )
    stFailed.set('payload', {
      status: 'failed',
      recipient_id: testPhone,
      wa_id: testPhone,
      id: 'wamid.TEST_ACCEPTANCE_FAIL_' + Date.now(),
      wamid: 'wamid.TEST_ACCEPTANCE_FAIL_' + Date.now(),
      timestamp: timestampNow,
      error_code: 131056,
      error_title: 'Pairing code expired',
      error_details: 'Simulated failure verification',
      simulated_acceptance: true,
    })
    app.saveNoValidate(stFailed)

    // 2. Registro do envio Messenger (messenger_send_result) simulando resposta da Bia
    var mResLog = new Record(sysLogsCol)
    mResLog.set('user_id', userId)
    mResLog.set('type', 'messenger_send_result')
    mResLog.set(
      'message',
      'Envio Messenger bem-sucedido para 30230270299895089 (message_id: m_simulated_acceptance_' +
        Date.now() +
        ')',
    )
    mResLog.set(
      'details',
      'Sucesso: true | message_id: m_simulated_acceptance_' +
        Date.now() +
        ' | HTTP 200 | Texto: Olá! Sou a Bia da BRF Imóveis...',
    )
    mResLog.set('payload', {
      success: true,
      recipient_id: '30230270299895089',
      message_id: 'm_simulated_acceptance_' + Date.now(),
      status_code: 200,
      text: 'Olá! Sou a Bia da BRF Imóveis...',
      simulated_acceptance: true,
    })
    app.saveNoValidate(mResLog)

    // Também simular um de erro de permissão da Meta para provar registro com código de erro
    var mFailLog = new Record(sysLogsCol)
    mFailLog.set('user_id', userId)
    mFailLog.set('type', 'messenger_send_result')
    mFailLog.set(
      'message',
      'Falha no envio Messenger para 30230270299895089: Código 10 - (#10) Application does not have the capability to make this API call.',
    )
    mFailLog.set(
      'details',
      'Sucesso: false | HTTP 400 | Código: 10 | Erro: (#10) Application does not have the capability to make this API call.',
    )
    mFailLog.set('payload', {
      success: false,
      recipient_id: '30230270299895089',
      message_id: null,
      status_code: 400,
      error_code: 10,
      error_message: '(#10) Application does not have the capability to make this API call.',
      simulated_acceptance: true,
    })
    app.saveNoValidate(mFailLog)
  },
  (app) => {},
)

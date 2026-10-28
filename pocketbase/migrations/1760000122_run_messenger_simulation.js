// Migration 1760000122: Simular entrada de mensagem Messenger e gravar nos logs para verificação
migrate(
  (app) => {
    const pageId = '1343797128806374'
    const senderId = 'psid_mauro_simulado_1343797'
    const text = 'Oi (mensagem de teste simulada para verificação dos logs do Messenger)'
    const nowIso = new Date().toISOString()

    const user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    const userId = user ? user.id : ''

    // 1. Simular o evento idêntico ao recebido no POST /backend/v1/messenger/webhook
    const sysLogsCol = app.findCollectionByNameOrId('system_logs')
    const auditLog = new Record(sysLogsCol, {
      user_id: userId,
      type: 'messenger_webhook_received',
      message: `Mensagem recebida no Messenger de ${senderId}: ${text}`,
      details: `Page ID: ${pageId} | Sender PSID: ${senderId} | Time: ${nowIso}`,
      payload: {
        page_id: pageId,
        sender_id: senderId,
        recipient_id: pageId,
        text: text,
        time: Date.now(),
        simulated: true,
      },
    })
    app.save(auditLog)

    console.log(
      `[MESSENGER_EVENT_RECEIVED] page_id: ${pageId} sender_id: ${senderId} text: "${text}"`,
    )
  },
  (app) => {},
)

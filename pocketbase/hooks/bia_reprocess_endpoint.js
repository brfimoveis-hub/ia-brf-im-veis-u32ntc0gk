// ============================================================
// BIA REPROCESS — Endpoint de recuperação/auditoria (Mauro)
// POST /backend/v1/bia_reprocess  { customer_id: "<id>" }
//
// Motivação: relato "ia nao responde" — mensagem do cliente chega pelo
// webhook (200) e é gravada em conversations, mas o motor ai_auto_reply.js
// (onRecordAfterCreateSuccess em 'conversations') não chegou a responder.
// Este endpoint permite reprocessar a última mensagem ENTRANTE de um cliente:
// cria uma nova linha em conversations (sender='customer', conteúdo idêntico)
// — o gatilho da IA dispara de novo normalmente.
//
// Só permite reprocessar se NÃO existir resposta da Bia (sender='ai')
// posterior à última mensagem do cliente (ou seja: a Bia realmente ficou
// calada). Uso auditado via system_logs (type='bia_reprocess').
// Requer sessão autenticada do painel (usuários do CRM).
// ============================================================
routerAdd(
  'POST',
  '/backend/v1/bia_reprocess',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) {
      var authId = e.requestInfo().headers['x-user-id'] || ''
      if (authId) {
        try {
          var u = $app.findRecordById('users', authId)
          if (u && u.id) userId = u.id
        } catch (_) {}
      }
    }
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária: faça login no painel.')
    }

    var body = e.requestInfo().body || {}
    var customerId = String(body.customer_id || '').trim()
    if (!customerId) {
      return e.badRequestError('customer_id obrigatório.')
    }

    // Cliente precisa existir
    try {
      $app.findRecordById('customers', customerId)
    } catch (_) {
      return e.notFoundError('Cliente não encontrado: ' + customerId)
    }

    // Últimas mensagens do cliente (mais recente primeiro)
    var msgs = []
    try {
      msgs = $app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + customerId.replace(/'/g, "''") + "'",
        '-created',
        50,
        0,
      )
    } catch (err) {
      return e.json(500, { error: 'Falha ao carregar conversa: ' + String(err) })
    }

    // Última mensagem ENTRANTE do lead
    var lastInbound = null
    for (var i = 0; i < msgs.length; i++) {
      var s = msgs[i].getString('sender')
      if (s === 'customer' || s === 'lead' || s === 'user') {
        lastInbound = msgs[i]
        break
      }
    }
    if (!lastInbound) {
      return e.notFoundError('Nenhuma mensagem do cliente encontrada para reprocessar.')
    }

    // Já houve resposta da Bia DEPOIS da última mensagem do cliente?
    var lastInboundCreated = new Date(lastInbound.getString('created')).getTime()
    for (var j = 0; j < msgs.length; j++) {
      var sj = msgs[j].getString('sender')
      if (sj !== 'ai' && sj !== 'agent') continue
      var tj = new Date(msgs[j].getString('created')).getTime()
      if (tj >= lastInboundCreated) {
        return e.json(200, {
          reprocessed: false,
          reason: 'A Bia já respondeu após a última mensagem do cliente — nada a reprocessar.',
          last_inbound_id: lastInbound.id,
        })
      }
    }

    var content = (lastInbound.getString('content') || '').trim()
    if (!content) {
      return e.badRequestError('Última mensagem do cliente está vazia; nada a reprocessar.')
    }

    // Cria a cópia para reativar o gatilho da IA (sender='customer')
    try {
      var convCol = $app.findCollectionByNameOrId('conversations')
      var copy = new Record(convCol)
      copy.set('customer_id', customerId)
      copy.set('user_id', lastInbound.getString('user_id') || '')
      copy.set('channel', lastInbound.getString('channel') || 'whatsapp')
      copy.set('sender', 'customer')
      copy.set('content', content)
      $app.saveNoValidate(copy)
    } catch (saveErr) {
      return e.json(500, { error: 'Falha ao gravar mensagem de reprocesso: ' + String(saveErr) })
    }

    // Auditoria
    try {
      var logsCol = $app.findCollectionByNameOrId('system_logs')
      var log = new Record(logsCol)
      log.set('user_id', userId)
      log.set('type', 'bia_reprocess')
      log.set('message', 'Reprocesso manual da última mensagem entrante do cliente ' + customerId)
      log.set(
        'details',
        JSON.stringify({
          customer_id: customerId,
          origin_message_id: lastInbound.id,
          channel: lastInbound.getString('channel') || 'whatsapp',
        }),
      )
      $app.saveNoValidate(log)
    } catch (_) {}

    return e.json(200, {
      reprocessed: true,
      customer_id: customerId,
      content: content.substring(0, 120),
      note: 'Mensagem regravada com sender=customer; o motor ai_auto_reply deve responder em segundos. Confira os logs [AI_REPLY].',
    })
  },
  $apis.requireAuth(),
)

/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000005 — PROVA VIVA: mensagem entrante de teste do motor da Bia
// ----------------------------------------------------------------------------
// Grava UMA mensagem sender='customer' ("Bom dia") na conversa de teste
// (customer w2by9dou6agtz6l, canal instagram) IMEDIATAMENTE antes da checagem
// de idempotência — o after-create dispara o motor e o log [AI_REPLY] captura
// o guard exato em que o motor para.
// Idempotente: no-op se a mensagem de teste desta rodada (idempotency_key no
// system_logs) já existir; em banco vazio (sem o customer) não faz nada.
// ============================================================================
migrate(
  (app) => {
    // Idempotência: se o sinal desta rodada já existe, não gravar de novo
    var already = null
    try {
      already = app.findFirstRecordByFilter('system_logs', "type = 'bia_probe_msg_v3'")
    } catch (_) {}

    var customer = null
    try {
      customer = app.findFirstRecordByFilter('customers', "id = 'w2by9dou6agtz6l'")
    } catch (_) {}
    if (!customer) {
      console.log(
        '[MIGRATION 1763000005] Customer de teste w2by9dou6agtz6l não existe neste banco — no-op.',
      )
      return
    }

    if (already) {
      console.log(
        '[MIGRATION 1763000005] Mensagem de teste v3 já gravada em rodada anterior — no-op (idempotência).',
      )
      return
    }

    var convCol = app.findCollectionByNameOrId('conversations')
    var msg = new Record(convCol)
    msg.set('customer_id', customer.id)
    msg.set('user_id', customer.getString('user_id') || '')
    msg.set('content', 'Bom dia')
    msg.set('sender', 'customer')
    msg.set('channel', 'instagram')
    app.saveNoValidate(msg)
    console.log(
      '[MIGRATION 1763000005] Mensagem entrante de teste gravada: id=' +
        msg.id +
        ' customer=' +
        customer.id,
    )

    try {
      var logsCol = app.findCollectionByNameOrId('system_logs')
      var log = new Record(logsCol)
      log.set('user_id', customer.getString('user_id') || '')
      log.set('type', 'bia_probe_msg_v3')
      log.set('message', 'Mensagem de teste do motor da Bia gravada (prova viva v3).')
      log.set('details', JSON.stringify({ conversation_id: msg.id, customer_id: customer.id }))
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {
    // down: no-op
  },
)

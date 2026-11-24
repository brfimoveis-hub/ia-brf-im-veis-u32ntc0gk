/// <reference path="../types.d.ts" />
// eslint-disable-next-line no-unused-vars
migrate(
  (app) => {
    // PROVA VIVA v0.0.1455 — segunda mensagem de teste (idempotente: no-op se já existir).
    // Grava mensagem ENTRANTE (sender='customer', texto "Bom dia, quero mais detalhes do empreendimento")
    // na conversa de teste w2by9dou6agtz6l (Instagram), disparando o motor da Bia com o
    // appsecret_proof corrigido. Não altera nenhum outro registro.
    const existing = app.findRecordsByFilter(
      'conversations',
      "customer_id = 'w2by9dou6agtz6l' && content ~ 'quero mais detalhes do empreendimento'",
      '-created',
      1,
      0,
    )
    if (existing && existing.length > 0) {
      return // idempotente — já rodou
    }
    const cust = app.findRecordById('customers', 'w2by9dou6agtz6l')
    const col = app.findCollectionByNameOrId('conversations')
    const rec = new Record(col)
    rec.set('user_id', cust.getString('user_id') || '')
    rec.set('customer_id', 'w2by9dou6agtz6l')
    rec.set('sender', 'customer')
    rec.set('channel', 'instagram')
    rec.set('content', 'Bom dia, quero mais detalhes do empreendimento')
    app.save(rec)
  },
  (app) => {
    // rollback: remove apenas a mensagem de teste desta prova (se existir)
    try {
      const recs = app.findRecordsByFilter(
        'conversations',
        "customer_id = 'w2by9dou6agtz6l' && content ~ 'quero mais detalhes do empreendimento'",
        '-created',
        10,
        0,
      )
      for (const r of recs) {
        app.delete(r)
      }
    } catch (_) {}
  },
)

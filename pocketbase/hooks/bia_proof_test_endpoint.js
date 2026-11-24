// ============================================================
// TEMPORÁRIO — PROVA VIVA (remover antes do commit!)
// GET /backend/v1/bia_proof_test?token=<token único>
// Reproduz uma mensagem entrante real (IG, cliente w2by9dou6agtz6l)
// regravando-a em conversations — o motor ai_auto_reply deve disparar.
// ============================================================
routerAdd('GET', '/backend/v1/bia_proof_test', (e) => {
  var token = (e.requestInfo().query && e.requestInfo().query.token) || ''
  if (token !== 'brf-proof-20261124-bia-x7k9q2') {
    return e.unauthorizedError('token invalido')
  }
  var cid = (e.requestInfo().query && e.requestInfo().query.customer_id) || 'w2by9dou6agtz6l'
  var content = (e.requestInfo().query && e.requestInfo().query.content) || 'Bom dia'
  var channel = (e.requestInfo().query && e.requestInfo().query.channel) || 'instagram'

  // Última mensagem do cliente para herdar user_id/sender
  var last = null
  try {
    var arr = $app.findRecordsByFilter(
      'conversations',
      "customer_id = '" + cid + "' && sender = 'customer'",
      '-created',
      1,
      0,
    )
    if (arr.length > 0) last = arr[0]
  } catch (err) {
    return e.json(500, { error: String(err) })
  }
  if (!last) return e.json(404, { error: 'nenhuma msg customer p/ cliente ' + cid })

  var convCol = $app.findCollectionByNameOrId('conversations')
  var copy = new Record(convCol)
  copy.set('customer_id', cid)
  copy.set('user_id', last.getString('user_id') || '')
  copy.set('channel', channel)
  copy.set('sender', 'customer')
  copy.set('content', content)
  $app.saveNoValidate(copy)

  console.log('[PROOF_TEST] Mensagem entrante regravada: customer=' + cid + ' canal=' + channel)
  return e.json(200, {
    ok: true,
    injected_content: content,
    channel: channel,
    customer_id: cid,
    note: 'Motor ai_auto_reply deve disparar agora (aguarde [AI_REPLY] nos logs).',
  })
})

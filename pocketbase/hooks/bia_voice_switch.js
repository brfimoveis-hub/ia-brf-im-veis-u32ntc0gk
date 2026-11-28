// CONTROLE DA VOZ NO ATENDIMENTO — liga/desliga sem mexer em código
// GET  /backend/v1/bia/voice/switch?on=1   -> liga
// GET  /backend/v1/bia/voice/switch?on=0   -> desliga
// GET  /backend/v1/bia/voice/switch        -> só mostra o estado
routerAdd('GET', '/backend/v1/bia/voice/switch', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var aplicado = null
  var erro = ''
  try {
    var col = $app.findCollectionByNameOrId('app_controls')
    var rec = null
    try {
      rec = $app.findFirstRecordByFilter('app_controls', "key = 'bia_voice_reply_active'")
    } catch (_) {
      rec = null
    }
    if (rec === null) {
      rec = new Record(col)
      rec.set('key', 'bia_voice_reply_active')
      rec.set('description', 'Bia responde em voz (nota de voz) no WhatsApp')
      rec.set('is_active', false)
      $app.save(rec)
    }
    if (q.on === '1' || q.on === 'true') {
      rec.set('is_active', true)
      $app.save(rec)
      aplicado = true
    } else if (q.on === '0' || q.on === 'false') {
      rec.set('is_active', false)
      $app.save(rec)
      aplicado = false
    }
    return e.json(200, {
      ok: true,
      chave: 'bia_voice_reply_active',
      estado: rec.getBool('is_active'),
      aplicado: aplicado,
    })
  } catch (err) {
    erro = String(err).substring(0, 250)
    return e.json(200, { ok: false, erro: erro })
  }
})

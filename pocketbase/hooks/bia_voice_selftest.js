// TESTE PONTUAL — simula a resposta da Bia num cliente que veio de áudio,
// executa o MESMO caminho do hook e devolve o resultado.
// GET /backend/v1/bia/voice/selftest?cust=<id do cliente>&on=1
routerAdd('GET', '/backend/v1/bia/voice/selftest', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var out = { passos: [] }

  // pega um cliente com telefone
  var cust = null
  try {
    if (q.cust) {
      cust = $app.findRecordById('customers', String(q.cust))
    } else {
      var lista = $app.findRecordsByFilter('customers', "phone != ''", '-created', 1, 0)
      if (lista && lista.length) cust = lista[0]
    }
  } catch (err) {
    return e.json(200, {
      ok: false,
      erro: 'cliente não encontrado: ' + String(err).substring(0, 120),
    })
  }
  if (!cust) return e.json(200, { ok: false, erro: 'nenhum cliente com telefone' })

  out.cliente = {
    id: cust.id,
    nome: cust.getString('name'),
    telefone: cust.getString('phone'),
  }

  // credenciais
  var apiKey = ''
  var voz = ''
  try {
    apiKey = String($secrets.get('GOOGLE_TTS_API_KEY') || '').trim()
    voz = String($secrets.get('GOOGLE_TTS_VOICE') || '').trim()
  } catch (_) {}
  if (!voz) voz = 'pt-BR-Chirp3-HD-Sulafat'
  out.voz = voz
  out.tem_chave = apiKey.length > 0
  if (!apiKey) return e.json(200, { ok: false, erro: 'sem chave TTS', passos: out.passos })

  var user = null
  try {
    var us = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
    if (us && us.length) user = us[0]
  } catch (_) {}
  if (!user) return e.json(200, { ok: false, erro: 'sem usuário' })
  var waToken = user.getString('meta_whatsapp_access_token') || ''
  var phoneId = user.getString('meta_whatsapp_phone_number_id') || ''
  out.credenciais_whatsapp = { token: waToken.length > 0, phone_id: phoneId.length > 0 }
  if (!waToken || !phoneId) return e.json(200, { ok: false, erro: 'sem credenciais WhatsApp' })

  var proof = ''
  try {
    var appSecret = user.getString('meta_app_secret') || ''
    if (!appSecret) appSecret = user.getString('meta_instagram_app_secret') || ''
    if (!appSecret) appSecret = String($os.getenv('META_APP_SECRET') || '')
    if (appSecret && waToken)
      proof = '?appsecret_proof=' + $security.hs256(String(waToken), String(appSecret))
  } catch (_) {}
  out.tem_proof = proof.length > 0

  var texto =
    'Perfeito! Tenho opções de três dormitórios em Barreiros a partir de novecentos e vinte e nove mil. Quer que eu te envie a tabela completa?'

  // 1 síntese
  var syn = $http.send({
    url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
    method: 'POST',
    headers: { 'X-Goog-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: texto },
      voice: { languageCode: 'pt-BR', name: voz },
      audioConfig: { audioEncoding: 'OGG_OPUS', sampleRateHertz: 48000, speakingRate: 0.95 },
    }),
    timeout: 60,
  })
  out.passos.push({ etapa: 'sintese', status: syn ? syn.statusCode : 0 })
  if (!syn || syn.statusCode !== 200 || !syn.json || !syn.json.audioContent) {
    return e.json(200, { ok: false, erro: 'síntese falhou', passos: out.passos })
  }
  var audio = new Uint8Array(Buffer.from(String(syn.json.audioContent), 'base64'))
  out.passos.push({ etapa: 'audio', bytes: audio.length })

  // 2 upload
  var boundary = '----BiaST' + $security.randomString(20)
  function bx(str) {
    var a = []
    for (var i = 0; i < str.length; i++) a.push(str.charCodeAt(i) & 0xff)
    return new Uint8Array(a)
  }
  var head =
    '--' +
    boundary +
    '\r\n' +
    'Content-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n' +
    '--' +
    boundary +
    '\r\n' +
    'Content-Disposition: form-data; name="type"\r\n\r\naudio/ogg\r\n' +
    '--' +
    boundary +
    '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="bia.ogg"\r\n' +
    'Content-Type: audio/ogg\r\n\r\n'
  var tail = '\r\n--' + boundary + '--\r\n'
  var hb = bx(head)
  var tb = bx(tail)
  var buf = new Uint8Array(hb.length + audio.length + tb.length)
  var off = 0
  buf.set(hb, off)
  off += hb.length
  buf.set(audio, off)
  off += audio.length
  buf.set(tb, off)

  var up = $http.send({
    url: 'https://graph.facebook.com/v21.0/' + phoneId + '/media' + proof,
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + waToken,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
    },
    body: buf,
    timeout: 90,
  })
  var mediaId = up && up.json && up.json.id ? String(up.json.id) : ''
  out.passos.push({ etapa: 'upload', status: up ? up.statusCode : 0, media_id: mediaId })
  if (!mediaId) return e.json(200, { ok: false, erro: 'upload falhou', passos: out.passos })

  if (String(q.enviar || '') !== '1') {
    out.ok = true
    out.nota = 'síntese e upload OK. Nada foi enviado (use enviar=1 para mandar)'
    return e.json(200, out)
  }

  // 3 envio
  var telefone = String(cust.getString('phone') || '').replace(/\D/g, '')
  if (telefone.length === 10 || telefone.length === 11) telefone = '55' + telefone
  var sendRes = $http.send({
    url: 'https://graph.facebook.com/v21.0/' + phoneId + '/messages' + proof,
    method: 'POST',
    headers: { Authorization: 'Bearer ' + waToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefone,
      type: 'audio',
      audio: { id: mediaId, voice: true },
    }),
    timeout: 45,
  })
  var wamid = ''
  try {
    if (sendRes && sendRes.json && sendRes.json.messages && sendRes.json.messages[0]) {
      wamid = sendRes.json.messages[0].id || ''
    }
  } catch (_) {}
  out.passos.push({
    etapa: 'envio',
    status: sendRes ? sendRes.statusCode : 0,
    wamid: wamid,
    para: telefone,
  })
  out.ok = !!wamid
  return e.json(200, out)
})

// SONDA TEMPORÁRIA 2 — tipo do corpo no $http.send + alcançabilidade pública
// Rota: POST /backend/v1/bia/voice/try2
routerAdd('POST', '/backend/v1/bia/voice/try2', (e) => {
  var user = null
  try {
    var us = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
    if (us && us.length) user = us[0]
  } catch (_) {}
  if (!user) return e.json(500, { ok: false, erro: 'sem usuário' })
  var waToken = user.getString('meta_whatsapp_access_token') || ''
  var phoneId = user.getString('meta_whatsapp_phone_number_id') || ''
  if (!waToken || !phoneId) return e.json(400, { ok: false, erro: 'sem credenciais' })

  var proof = ''
  try {
    var appSecret = user.getString('meta_app_secret') || ''
    if (!appSecret) appSecret = user.getString('meta_instagram_app_secret') || ''
    if (!appSecret) appSecret = String($os.getenv('META_APP_SECRET') || '')
    if (appSecret && waToken)
      proof = '?appsecret_proof=' + $security.hs256(String(waToken), String(appSecret))
  } catch (_) {}

  var apiKey = ''
  try {
    apiKey = String($secrets.get('GOOGLE_TTS_API_KEY') || '').trim()
  } catch (_) {}
  if (!apiKey) return e.json(400, { ok: false, erro: 'sem chave TTS' })

  var syn = $http.send({
    url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
    method: 'POST',
    headers: { 'X-Goog-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: 'Teste de envio de voz numero dois.' },
      voice: { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Sulafat' },
      audioConfig: { audioEncoding: 'OGG_OPUS', sampleRateHertz: 48000 },
    }),
    timeout: 60,
  })
  if (!syn || syn.statusCode !== 200 || !syn.json || !syn.json.audioContent) {
    return e.json(502, { ok: false, erro: 'síntese falhou' })
  }
  var audio = new Uint8Array(Buffer.from(String(syn.json.audioContent), 'base64'))

  function bytesOf(str) {
    var a = []
    for (var i = 0; i < str.length; i++) a.push(str.charCodeAt(i) & 0xff)
    return new Uint8Array(a)
  }
  function montar(boundary) {
    var pProd =
      '--' +
      boundary +
      '\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n'
    var pFile =
      '--' +
      boundary +
      '\r\nContent-Disposition: form-data; name="file"; filename="bia.ogg"\r\nContent-Type: audio/ogg\r\n\r\n'
    var pTail = '\r\n--' + boundary + '--\r\n'
    var partes = [bytesOf(pProd), bytesOf(pFile), audio, bytesOf(pTail)]
    var total = 0
    for (var i = 0; i < partes.length; i++) total += partes[i].length
    var buf = new Uint8Array(total)
    var off = 0
    for (var j = 0; j < partes.length; j++) {
      buf.set(partes[j], off)
      off += partes[j].length
    }
    return buf
  }

  var out = []

  // variante F: corpo = Uint8Array (sem .buffer)
  try {
    var bnF = '----BiaF' + $security.randomString(20)
    var bF = montar(bnF)
    var rF = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneId + '/media' + proof,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + waToken,
        'Content-Type': 'multipart/form-data; boundary=' + bnF,
      },
      body: bF,
      timeout: 60,
    })
    out.push({
      v: 'F_uint8_direto',
      status: rF ? rF.statusCode : 0,
      resp: JSON.stringify(rF && rF.json ? rF.json : {}).substring(0, 200),
    })
  } catch (err) {
    out.push({ v: 'F_uint8_direto', status: 0, resp: 'THROW ' + String(err).substring(0, 200) })
  }

  // variante G: corpo = ArrayBuffer nativo
  try {
    var bn = '----BiaG' + $security.randomString(20)
    var bG = montar(bn)
    var rG = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneId + '/media' + proof,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + waToken,
        'Content-Type': 'multipart/form-data; boundary=' + bn,
      },
      body: bG.buffer,
      timeout: 60,
    })
    out.push({
      v: 'G_arraybuffer',
      status: rG ? rG.statusCode : 0,
      resp: JSON.stringify(rG && rG.json ? rG.json : {}).substring(0, 200),
    })
  } catch (err) {
    out.push({ v: 'G_arraybuffer', status: 0, resp: 'THROW ' + String(err).substring(0, 200) })
  }

  // quem sou eu publicamente? testa hosts conhecidos
  var hosts = [
    'https://ia-uazapi-6d79e.goskip.app/api/health',
    'https://ia-uazapi-6d79e.shrd03-1.goskip.dev/api/health',
    'https://ia-uazapi-6d79e.goskip.app/backend/v1/bia/voice/status',
  ]
  var alcance = []
  for (var h = 0; h < hosts.length; h++) {
    var st = 0
    var cor = ''
    try {
      var rr = $http.send({ url: hosts[h], method: 'GET', timeout: 20 })
      st = rr ? rr.statusCode : 0
      if (rr && typeof rr.body === 'string') cor = rr.body.substring(0, 80)
      else if (rr && rr.json) cor = JSON.stringify(rr.json).substring(0, 80)
    } catch (err) {
      cor = 'ERR'
    }
    alcance.push({ url: hosts[h], status: st, inicio: cor })
  }

  return e.json(200, { audio_bytes: audio.length, upload: out, alcance: alcance })
})

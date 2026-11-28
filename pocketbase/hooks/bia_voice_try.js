// ============================================================================
// SONDA TEMPORÁRIA — qual formato de multipart a Meta aceita em /media
// Rota: POST /backend/v1/bia/voice/try  body: { to?, audio_base64? }
// Não envia mensagem a ninguém: só sobe o arquivo e reporta o resultado.
// Será removida depois do diagnóstico.
// ============================================================================

routerAdd('POST', '/backend/v1/bia/voice/try', (e) => {
  var b = {}
  try {
    b = e.requestInfo().body || {}
  } catch (_) {}

  // credenciais
  var user = null
  try {
    var us = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
    if (us && us.length) user = us[0]
  } catch (_) {}
  if (!user) return e.json(500, { ok: false, erro: 'sem usuário' })
  var waToken = user.getString('meta_whatsapp_access_token') || ''
  var phoneId = user.getString('meta_whatsapp_phone_number_id') || ''
  if (!waToken || !phoneId) return e.json(400, { ok: false, erro: 'sem credenciais WhatsApp' })

  var proof = ''
  try {
    var appSecret = user.getString('meta_app_secret') || ''
    if (!appSecret) appSecret = user.getString('meta_instagram_app_secret') || ''
    if (!appSecret) appSecret = String($os.getenv('META_APP_SECRET') || '')
    if (appSecret && waToken)
      proof = '?appsecret_proof=' + $security.hs256(String(waToken), String(appSecret))
  } catch (_) {}

  // áudio de teste: gera pelo Google se não vier no corpo
  var audio = null
  if (b.audio_base64) {
    try {
      audio = new Uint8Array(Buffer.from(String(b.audio_base64), 'base64'))
    } catch (_) {}
  }
  if (!audio) {
    var apiKey = ''
    try {
      apiKey = String($secrets.get('GOOGLE_TTS_API_KEY') || '').trim()
    } catch (_) {}
    if (!apiKey) return e.json(400, { ok: false, erro: 'sem chave de voz e sem audio_base64' })
    var syn = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
      method: 'POST',
      headers: { 'X-Goog-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: 'Teste de envio de voz.' },
        voice: { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Sulafat' },
        audioConfig: { audioEncoding: 'OGG_OPUS', sampleRateHertz: 48000 },
      }),
      timeout: 60,
    })
    if (!syn || syn.statusCode !== 200 || !syn.json || !syn.json.audioContent) {
      return e.json(502, { ok: false, erro: 'falha na síntese de teste' })
    }
    audio = new Uint8Array(Buffer.from(String(syn.json.audioContent), 'base64'))
  }

  function bytesOf(str) {
    var a = []
    for (var i = 0; i < str.length; i++) a.push(str.charCodeAt(i) & 0xff)
    return new Uint8Array(a)
  }

  function montar(boundary, incluirType, filePrimeiro) {
    var pProd =
      '--' +
      boundary +
      '\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n'
    var pType =
      '--' + boundary + '\r\nContent-Disposition: form-data; name="type"\r\n\r\naudio/ogg\r\n'
    var pFile =
      '--' +
      boundary +
      '\r\nContent-Disposition: form-data; name="file"; filename="bia.ogg"\r\nContent-Type: audio/ogg\r\n\r\n'
    var pTail = '\r\n--' + boundary + '--\r\n'

    var partes = []
    if (filePrimeiro) {
      partes.push(bytesOf(pFile), audio, bytesOf(pProd))
      if (incluirType) partes.push(bytesOf(pType))
    } else {
      partes.push(bytesOf(pProd))
      if (incluirType) partes.push(bytesOf(pType))
      partes.push(bytesOf(pFile), audio)
    }
    partes.push(bytesOf(pTail))

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

  var variantes = [
    {
      nome: 'A_atual_com_type_com_proof',
      comType: true,
      filePrimeiro: false,
      comProof: true,
      boundaryStyle: 'dash',
    },
    {
      nome: 'B_sem_type_com_proof',
      comType: false,
      filePrimeiro: false,
      comProof: true,
      boundaryStyle: 'dash',
    },
    {
      nome: 'C_sem_type_sem_proof',
      comType: false,
      filePrimeiro: false,
      comProof: false,
      boundaryStyle: 'dash',
    },
    {
      nome: 'D_file_primeiro_sem_proof',
      comType: false,
      filePrimeiro: true,
      comProof: false,
      boundaryStyle: 'dash',
    },
    {
      nome: 'E_boundary_simples',
      comType: false,
      filePrimeiro: false,
      comProof: true,
      boundaryStyle: 'plain',
    },
  ]

  var resultados = []
  for (var v = 0; v < variantes.length; v++) {
    var cfg = variantes[v]
    var boundary =
      cfg.boundaryStyle === 'plain'
        ? 'BiaVoice' + $security.randomString(20)
        : '----BiaVoice' + $security.randomString(20)
    var payload = montar(boundary, cfg.comType, cfg.filePrimeiro)
    var url = 'https://graph.facebook.com/v21.0/' + phoneId + '/media' + (cfg.comProof ? proof : '')

    var r = null
    var st = 0
    var resp = ''
    try {
      r = $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + waToken,
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
        },
        body: payload.buffer,
        timeout: 60,
      })
      st = r ? r.statusCode : 0
      if (r && r.json) resp = JSON.stringify(r.json).substring(0, 300)
      else if (r && typeof r.body === 'string') resp = r.body.substring(0, 300)
      else if (r && r.body && r.body.length) {
        resp = String.fromCharCode.apply(null, Array.prototype.slice.call(r.body, 0, 300))
      }
    } catch (err) {
      resp = 'ERR ' + String(err).substring(0, 200)
    }
    resultados.push({
      variante: cfg.nome,
      status: st,
      media_id: r && r.json && r.json.id ? String(r.json.id) : '',
      resposta: resp,
      bytes: payload.length,
    })
  }

  return e.json(200, { audio_bytes: audio.length, resultados: resultados })
})

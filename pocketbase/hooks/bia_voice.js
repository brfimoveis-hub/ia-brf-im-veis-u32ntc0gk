// ============================================================================
// VOZ DA BIA — BRF IMÓVEIS
//
// Perfil pedido pelo Mauro: aveludada, executiva, agradável ao ouvido.
//
// PROVEDOR: Google Cloud Text-to-Speech (Chirp 3: HD)
//   - 1 milhão de caracteres/mês grátis  -> na prática custo zero no volume atual
//   - Vozes pt-BR Chirp3-HD: Aoede, Kore, Leda, Zephyr, Callirrhoe, Despina, ...
//   - Saída OGG_OPUS nativa, que é exatamente o formato de nota de voz do WhatsApp
//
// AUTENTICAÇÃO: conta de serviço do Google (JSON).
//   A API do Google TTS NÃO aceita chave simples (API key) de forma confiável:
//   a documentação de autenticação exige credencial de serviço. Por isso o
//   segredo é o JSON inteiro da conta de serviço, e o token é obtido aqui
//   assinando um JWT RS256 com a chave privada dela (fluxo OAuth2 padrão).
//
// ROTAS:
//   GET  /backend/v1/bia/voice/status   -> está pronta? (não gasta nada)
//   GET  /backend/v1/bia/voice/voices   -> lista as vozes pt-BR disponíveis
//   GET/POST /backend/v1/bia/voice/sample?voice=...&text=...
//                                       -> devolve o ÁUDIO para o Mauro ouvir
//   POST /backend/v1/bia/voice/say      -> sintetiza e envia NOTA DE VOZ no WhatsApp
//
// Segredos (nunca no código):
//   GOOGLE_TTS_SA_JSON  -> conteúdo do JSON da conta de serviço
//   GOOGLE_TTS_VOICE    -> ex.: pt-BR-Chirp3-HD-Aoede
//
// IMPORTANTE: no Skip Cloud cada handler é extraído sem o escopo do arquivo,
// então cada handler é autossuficiente (nenhuma função auxiliar no topo).
// ============================================================================

// ---------------------------------------------------------------------------
// STATUS
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/bia/voice/status', (e) => {
  function sec(k) {
    try {
      if (typeof $secrets !== 'undefined' && $secrets.has && $secrets.has(k)) {
        return String($secrets.get(k) || '').trim()
      }
    } catch (_) {}
    try {
      return String($os.getenv(k) || '').trim()
    } catch (_) {}
    return ''
  }

  var raw = sec('GOOGLE_TTS_SA_JSON')
  var voice = sec('GOOGLE_TTS_VOICE') || 'pt-BR-Chirp3-HD-Aoede'

  var saOk = false
  var saEmail = ''
  var problema = ''
  if (!raw) {
    problema = 'GOOGLE_TTS_SA_JSON não configurado'
  } else {
    try {
      var sa = JSON.parse(raw)
      saEmail = String(sa.client_email || '')
      saOk = !!(sa.client_email && sa.private_key && sa.project_id)
      if (!saOk) problema = 'JSON sem client_email/private_key/project_id'
    } catch (err) {
      problema = 'JSON inválido: ' + String(err).substring(0, 120)
    }
  }

  var ativo = false
  try {
    var rc = $app.findFirstRecordByFilter('app_controls', "key = 'bia_voice_reply_active'")
    ativo = rc.getBool('is_active')
  } catch (_) {}

  return e.json(200, {
    credencial_ok: saOk,
    conta_servico: saEmail ? saEmail.substring(0, 40) : '',
    projeto: (function () {
      try {
        return JSON.parse(raw).project_id || ''
      } catch (_) {
        return ''
      }
    })(),
    voz: voice,
    resposta_em_voz_ativa: ativo,
    pronto: saOk && ativo,
    problema: problema,
    nota: ativo
      ? 'Bia responde em voz quando o cliente manda áudio.'
      : 'Desligado: Bia responde por texto até o Mauro aprovar a voz.',
  })
})

// ---------------------------------------------------------------------------
// VOICES — lista as vozes pt-BR disponíveis (precisa da credencial)
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/bia/voice/voices', (e) => {
  var raw = ''
  try {
    raw = String($secrets.get('GOOGLE_TTS_SA_JSON') || '').trim()
  } catch (_) {}
  if (!raw) return e.json(400, { ok: false, erro: 'GOOGLE_TTS_SA_JSON não configurado' })

  var sa = null
  try {
    sa = JSON.parse(raw)
  } catch (err) {
    return e.json(400, { ok: false, erro: 'JSON da conta de serviço inválido' })
  }

  // --- token OAuth2 a partir do JWT RS256
  var crypto = null
  try {
    crypto = require('crypto')
  } catch (err) {
    return e.json(500, { ok: false, erro: 'módulo crypto indisponível: ' + String(err) })
  }

  function b64url(buf) {
    return Buffer.from(buf)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  var now = Math.floor(Date.now() / 1000)
  var header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  var claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  )
  var signingInput = header + '.' + claim
  var signature = ''
  try {
    var signer = crypto.createSign('RSA-SHA256')
    signer.update(signingInput)
    signature = b64url(signer.sign(String(sa.private_key)))
  } catch (err) {
    return e.json(500, {
      ok: false,
      erro: 'falha ao assinar JWT: ' + String(err).substring(0, 150),
    })
  }
  var assertion = signingInput + '.' + signature

  var tokRes = null
  try {
    tokRes = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=' +
        encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
        '&assertion=' +
        encodeURIComponent(assertion),
      timeout: 30,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: 'falha de rede no token: ' + String(err) })
  }
  if (!tokRes || tokRes.statusCode !== 200 || !tokRes.json || !tokRes.json.access_token) {
    var e1 = ''
    try {
      if (tokRes && tokRes.json && tokRes.json.error_description)
        e1 = String(tokRes.json.error_description).substring(0, 200)
    } catch (_) {}
    return e.json(502, {
      ok: false,
      status: tokRes ? tokRes.statusCode : 0,
      erro: 'Google recusou o token: ' + e1,
    })
  }
  var token = tokRes.json.access_token

  var listRes = null
  try {
    listRes = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/voices?languageCode=pt-BR',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
      timeout: 30,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }
  if (!listRes || listRes.statusCode !== 200 || !listRes.json) {
    return e.json(502, {
      ok: false,
      status: listRes ? listRes.statusCode : 0,
      erro: 'falha ao listar vozes',
    })
  }

  var vs = (listRes.json && listRes.json.voices) || []
  var out = []
  for (var i = 0; i < vs.length; i++) {
    var v = vs[i] || {}
    var n = String(v.name || '')
    out.push({
      voz: n,
      genero: v.ssmlGender || '',
      taxa_natural: v.naturalSampleRateHertz || 0,
      chirp: n.indexOf('Chirp3-HD') !== -1,
    })
  }
  out.sort(function (a, b) {
    if (a.chirp !== b.chirp) return a.chirp ? -1 : 1
    return a.voz < b.voz ? -1 : 1
  })
  return e.json(200, { ok: true, total: out.length, vozes: out })
})

// ---------------------------------------------------------------------------
// SAMPLE — devolve o áudio para o Mauro ESCUTAR e aprovar
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/bia/voice/sample', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var raw = ''
  var defaultVoice = ''
  try {
    raw = String($secrets.get('GOOGLE_TTS_SA_JSON') || '').trim()
  } catch (_) {}
  try {
    defaultVoice = String($secrets.get('GOOGLE_TTS_VOICE') || '').trim()
  } catch (_) {}
  if (!raw) return e.json(400, { ok: false, erro: 'GOOGLE_TTS_SA_JSON não configurado' })

  var sa = null
  try {
    sa = JSON.parse(raw)
  } catch (_) {
    return e.json(400, { ok: false, erro: 'JSON da conta de serviço inválido' })
  }

  var voice = String(q.voice || defaultVoice || 'pt-BR-Chirp3-HD-Aoede').trim()
  if (!/^pt-BR-[A-Za-z0-9-]+$/.test(voice)) {
    return e.json(400, { ok: false, erro: 'voz inválida (use pt-BR-...)' })
  }

  var texto =
    String(q.text || '').trim() ||
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. ' +
      'Eu cuido dos lançamentos e dos imóveis de terceiros aqui em Florianópolis e região. ' +
      'Me conta o que você procura, que eu te mostro as opções que realmente combinam com você.'

  var crypto = null
  try {
    crypto = require('crypto')
  } catch (err) {
    return e.json(500, { ok: false, erro: 'crypto indisponível' })
  }
  function b64(b) {
    return Buffer.from(b)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  var now = Math.floor(Date.now() / 1000)
  var si =
    b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    )
  var sig = ''
  try {
    var s = crypto.createSign('RSA-SHA256')
    s.update(si)
    sig = b64(s.sign(String(sa.private_key)))
  } catch (err) {
    return e.json(500, { ok: false, erro: 'falha ao assinar JWT' })
  }

  var tok = null
  try {
    tok = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=' +
        encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
        '&assertion=' +
        encodeURIComponent(si + '.' + sig),
      timeout: 30,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }
  if (!tok || tok.statusCode !== 200 || !tok.json || !tok.json.access_token) {
    var d = ''
    try {
      if (tok && tok.json && tok.json.error_description)
        d = String(tok.json.error_description).substring(0, 200)
    } catch (_) {}
    return e.json(502, {
      ok: false,
      status: tok ? tok.statusCode : 0,
      erro: 'token recusado: ' + d,
    })
  }

  var enc = q.format === 'mp3' ? 'MP3' : 'OGG_OPUS'
  var bodyReq = {
    input: { text: texto.substring(0, 4000) },
    voice: { languageCode: 'pt-BR', name: voice },
    audioConfig: {
      audioEncoding: enc,
      sampleRateHertz: enc === 'OGG_OPUS' ? 48000 : 24000,
      speakingRate: Number(q.rate || 0.95),
      pitch: Number(q.pitch || 0),
    },
  }

  var syn = null
  try {
    syn = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + tok.json.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyReq),
      timeout: 90,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }

  if (!syn || syn.statusCode !== 200 || !syn.json || !syn.json.audioContent) {
    var em = ''
    try {
      if (syn && syn.json && syn.json.error && syn.json.error.message)
        em = String(syn.json.error.message).substring(0, 250)
    } catch (_) {}
    return e.json(502, {
      ok: false,
      status: syn ? syn.statusCode : 0,
      erro: em || 'Google recusou a síntese',
      voz: voice,
    })
  }

  var bytes = null
  try {
    bytes = new Uint8Array(Buffer.from(String(syn.json.audioContent), 'base64'))
  } catch (err) {
    return e.json(500, { ok: false, erro: 'falha ao decodificar o áudio' })
  }
  if (!bytes || !bytes.length) return e.json(502, { ok: false, erro: 'áudio vazio' })

  return e.blob(200, enc === 'MP3' ? 'audio/mpeg' : 'audio/ogg', bytes)
})

routerAdd('POST', '/backend/v1/bia/voice/sample', (e) => {
  var b = {}
  try {
    b = e.requestInfo().body || {}
  } catch (_) {}

  var raw = ''
  var defaultVoice = ''
  try {
    raw = String($secrets.get('GOOGLE_TTS_SA_JSON') || '').trim()
  } catch (_) {}
  try {
    defaultVoice = String($secrets.get('GOOGLE_TTS_VOICE') || '').trim()
  } catch (_) {}
  if (!raw) return e.json(400, { ok: false, erro: 'GOOGLE_TTS_SA_JSON não configurado' })

  var sa = null
  try {
    sa = JSON.parse(raw)
  } catch (_) {
    return e.json(400, { ok: false, erro: 'JSON inválido' })
  }

  var voice = String(b.voice || defaultVoice || 'pt-BR-Chirp3-HD-Aoede').trim()
  if (!/^pt-BR-[A-Za-z0-9-]+$/.test(voice)) return e.json(400, { ok: false, erro: 'voz inválida' })

  var texto =
    String(b.text || '').trim() ||
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. Me conta o que você procura.'

  var crypto = null
  try {
    crypto = require('crypto')
  } catch (_) {
    return e.json(500, { ok: false, erro: 'crypto indisponível' })
  }
  function b64(x) {
    return Buffer.from(x)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  var now = Math.floor(Date.now() / 1000)
  var si =
    b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    )
  var sg = ''
  try {
    var sr = crypto.createSign('RSA-SHA256')
    sr.update(si)
    sg = b64(sr.sign(String(sa.private_key)))
  } catch (_) {
    return e.json(500, { ok: false, erro: 'falha ao assinar JWT' })
  }

  var tk = null
  try {
    tk = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=' +
        encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
        '&assertion=' +
        encodeURIComponent(si + '.' + sg),
      timeout: 30,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }
  if (!tk || tk.statusCode !== 200 || !tk.json || !tk.json.access_token) {
    return e.json(502, { ok: false, status: tk ? tk.statusCode : 0, erro: 'token recusado' })
  }

  var enc = b.format === 'mp3' ? 'MP3' : 'OGG_OPUS'
  var syn = null
  try {
    syn = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + tk.json.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: texto.substring(0, 4000) },
        voice: { languageCode: 'pt-BR', name: voice },
        audioConfig: {
          audioEncoding: enc,
          sampleRateHertz: enc === 'OGG_OPUS' ? 48000 : 24000,
          speakingRate: Number(b.rate || 0.95),
        },
      }),
      timeout: 90,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }
  if (!syn || syn.statusCode !== 200 || !syn.json || !syn.json.audioContent) {
    var m = ''
    try {
      if (syn && syn.json && syn.json.error && syn.json.error.message)
        m = String(syn.json.error.message)
    } catch (_) {}
    return e.json(502, {
      ok: false,
      status: syn ? syn.statusCode : 0,
      erro: m || 'síntese recusada',
    })
  }

  var by = null
  try {
    by = new Uint8Array(Buffer.from(String(syn.json.audioContent), 'base64'))
  } catch (_) {
    return e.json(500, { ok: false, erro: 'falha ao decodificar' })
  }
  return e.blob(200, enc === 'MP3' ? 'audio/mpeg' : 'audio/ogg', by)
})

// ---------------------------------------------------------------------------
// SAY — sintetiza e envia NOTA DE VOZ no WhatsApp
// Body: { to: "5548999999999", text: "...", voice?: "pt-BR-Chirp3-HD-Aoede" }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/bia/voice/say', (e) => {
  var b = {}
  try {
    b = e.requestInfo().body || {}
  } catch (_) {}

  var to = String(b.to || '').replace(/\D/g, '')
  if (to.length === 10 || to.length === 11) to = '55' + to
  var texto = String(b.text || '').trim()
  if (!to) return e.json(400, { ok: false, erro: 'informe o destino (to)' })
  if (!texto) return e.json(400, { ok: false, erro: 'informe o texto' })

  var raw = ''
  var voice = ''
  try {
    raw = String($secrets.get('GOOGLE_TTS_SA_JSON') || '').trim()
  } catch (_) {}
  try {
    voice = String($secrets.get('GOOGLE_TTS_VOICE') || '').trim()
  } catch (_) {}
  if (String(b.voice || '').trim()) voice = String(b.voice).trim()
  if (!voice) voice = 'pt-BR-Chirp3-HD-Aoede'
  if (!raw) return e.json(400, { ok: false, erro: 'GOOGLE_TTS_SA_JSON não configurado' })

  var sa = null
  try {
    sa = JSON.parse(raw)
  } catch (_) {
    return e.json(400, { ok: false, erro: 'JSON da conta de serviço inválido' })
  }

  // credenciais do WhatsApp
  var user = null
  try {
    var us = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
    if (us && us.length) user = us[0]
  } catch (_) {}
  if (!user) return e.json(500, { ok: false, erro: 'usuário do CRM não encontrado' })
  var waToken = user.getString('meta_whatsapp_access_token') || ''
  var phoneId = user.getString('meta_whatsapp_phone_number_id') || ''
  if (!waToken || !phoneId)
    return e.json(400, { ok: false, erro: 'credenciais do WhatsApp ausentes' })

  // 1) token Google
  var crypto = null
  try {
    crypto = require('crypto')
  } catch (_) {
    return e.json(500, { ok: false, erro: 'crypto indisponível' })
  }
  function b64z(x) {
    return Buffer.from(x)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  var now = Math.floor(Date.now() / 1000)
  var si =
    b64z(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64z(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    )
  var sg = ''
  try {
    var sr = crypto.createSign('RSA-SHA256')
    sr.update(si)
    sg = b64z(sr.sign(String(sa.private_key)))
  } catch (_) {
    return e.json(500, { ok: false, erro: 'falha ao assinar JWT' })
  }

  var tk = null
  try {
    tk = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=' +
        encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
        '&assertion=' +
        encodeURIComponent(si + '.' + sg),
      timeout: 30,
    })
  } catch (err) {
    return e.json(502, { ok: false, etapa: 'token', erro: String(err) })
  }
  if (!tk || tk.statusCode !== 200 || !tk.json || !tk.json.access_token) {
    return e.json(502, {
      ok: false,
      etapa: 'token',
      status: tk ? tk.statusCode : 0,
      erro: 'Google recusou o token',
    })
  }

  // 2) síntese em OGG_OPUS
  var syn = null
  try {
    syn = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + tk.json.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: texto.substring(0, 4000) },
        voice: { languageCode: 'pt-BR', name: voice },
        audioConfig: { audioEncoding: 'OGG_OPUS', sampleRateHertz: 48000, speakingRate: 0.95 },
      }),
      timeout: 90,
    })
  } catch (err) {
    return e.json(502, { ok: false, etapa: 'tts', erro: String(err) })
  }
  if (!syn || syn.statusCode !== 200 || !syn.json || !syn.json.audioContent) {
    var em2 = ''
    try {
      if (syn && syn.json && syn.json.error && syn.json.error.message)
        em2 = String(syn.json.error.message).substring(0, 200)
    } catch (_) {}
    return e.json(502, {
      ok: false,
      etapa: 'tts',
      status: syn ? syn.statusCode : 0,
      erro: em2 || 'síntese recusada',
    })
  }

  var audio = null
  try {
    audio = new Uint8Array(Buffer.from(String(syn.json.audioContent), 'base64'))
  } catch (_) {
    return e.json(500, { ok: false, etapa: 'decode', erro: 'falha ao decodificar o áudio' })
  }
  if (!audio || !audio.length)
    return e.json(502, { ok: false, etapa: 'decode', erro: 'áudio vazio' })
  if (audio.length > 900000)
    return e.json(500, { ok: false, erro: 'áudio grande demais para nota de voz' })

  // 3) upload para a Meta (multipart montado byte a byte)
  var boundary = '----BiaVoice' + $security.randomString(24)
  function toBytes(str) {
    var arr = []
    for (var i = 0; i < str.length; i++) arr.push(str.charCodeAt(i) & 0xff)
    return new Uint8Array(arr)
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

  var hb = toBytes(head)
  var tb = toBytes(tail)
  var buf = new Uint8Array(hb.length + audio.length + tb.length)
  var off = 0
  buf.set(hb, off)
  off += hb.length
  buf.set(audio, off)
  off += audio.length
  buf.set(tb, off)

  var up = null
  try {
    up = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneId + '/media',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + waToken,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
      },
      body: buf.buffer,
      timeout: 90,
    })
  } catch (err) {
    return e.json(502, { ok: false, etapa: 'upload', erro: String(err) })
  }
  var mediaId = up && up.json && up.json.id ? String(up.json.id) : ''
  if (!mediaId) {
    return e.json(502, {
      ok: false,
      etapa: 'upload',
      status: up ? up.statusCode : 0,
      erro: 'Meta não devolveu media id',
    })
  }

  // 4) enviar como nota de voz
  var sendRes = null
  try {
    sendRes = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneId + '/messages',
      method: 'POST',
      headers: { Authorization: 'Bearer ' + waToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'audio',
        audio: { id: mediaId, voice: true },
      }),
      timeout: 45,
    })
  } catch (err) {
    return e.json(502, { ok: false, etapa: 'send', media_id: mediaId, erro: String(err) })
  }

  var wamid = ''
  try {
    if (sendRes && sendRes.json && sendRes.json.messages && sendRes.json.messages[0]) {
      wamid = sendRes.json.messages[0].id || ''
    }
  } catch (_) {}

  try {
    var lc = $app.findCollectionByNameOrId('system_logs')
    var lg = new Record(lc)
    lg.set('type', 'whatsapp_ai_send')
    lg.set('message', wamid ? 'Nota de voz da Bia enviada' : 'Falha ao enviar nota de voz da Bia')
    lg.set(
      'details',
      JSON.stringify({
        phone: to,
        wamid: wamid,
        media_id: mediaId,
        status: wamid ? 'sent' : 'failed',
        task_type: 'voice_reply',
        voz: voice,
        chars: texto.length,
        audio_bytes: audio.length,
      }),
    )
    $app.saveNoValidate(lg)
  } catch (_) {}

  return e.json(wamid ? 200 : 502, {
    ok: !!wamid,
    media_id: mediaId,
    wamid: wamid,
    voz: voice,
    audio_bytes: audio.length,
    status_meta: sendRes ? sendRes.statusCode : 0,
  })
})

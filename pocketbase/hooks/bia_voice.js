// ============================================================================
// VOZ DA BIA — BRF IMÓVEIS
//
// Perfil pedido pelo Mauro: aveludada, executiva, agradável ao ouvido.
//
// PROVEDOR: Google Cloud Text-to-Speech (Chirp 3: HD)
//   - 1 milhão de caracteres/mês grátis -> custo zero no volume atual
//   - Voz escolhida (alta renda): pt-BR-Chirp3-HD-Kore
//     Descritor oficial Google: "Firm" / "Clear & Professional" /
//     "Precise, Authoritative, Trustworthy" — é a voz de marca confiante,
//     que é o registro que comprador de alto padrão espera. Alternativas
//     guardadas para comparação: Despina (smooth/aveludada),
//     Sulafat (warm/trustworthy), Gacrux (mature/gravitas).
//   - Saída OGG_OPUS nativa = exatamente o formato de nota de voz do WhatsApp
//
// AUTENTICAÇÃO (em ordem de preferência):
//   1) GOOGLE_TTS_API_KEY  -> chave simples do Google Cloud (caminho fácil)
//   2) GOOGLE_TTS_SA_JSON  -> JSON da conta de serviço (JWT RS256 -> OAuth2)
//
// ROTAS:
//   GET  /backend/v1/bia/voice/status  -> está pronta? (não gasta nada)
//   GET  /backend/v1/bia/voice/voices  -> lista as vozes pt-BR
//   GET  /backend/v1/bia/voice/sample?voice=...&format=mp3&text=...
//                                      -> devolve o ÁUDIO para o Mauro ouvir
//   POST /backend/v1/bia/voice/say     -> sintetiza e envia NOTA DE VOZ no WhatsApp
//
// Segredos: GOOGLE_TTS_API_KEY | GOOGLE_TTS_SA_JSON | GOOGLE_TTS_VOICE
//
// IMPORTANTE: no Skip Cloud cada handler é extraído sem o escopo do arquivo.
// Cada handler é autossuficiente e faz require() dentro do próprio corpo.
// ============================================================================

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

  var apiKey = sec('GOOGLE_TTS_API_KEY')
  var saRaw = sec('GOOGLE_TTS_SA_JSON')
  var voz = sec('GOOGLE_TTS_VOICE') || 'pt-BR-Chirp3-HD-Kore'

  var saEmail = ''
  var saProjeto = ''
  var saOk = false
  var saErro = ''
  if (saRaw) {
    try {
      var sa = JSON.parse(saRaw)
      saEmail = String(sa.client_email || '')
      saProjeto = String(sa.project_id || '')
      saOk = !!(saEmail && sa.private_key)
      if (!saOk) saErro = 'JSON sem client_email/private_key'
    } catch (err) {
      saErro = 'JSON inválido'
    }
  }

  // auto-teste do runtime: base64 e require funcionam neste pod?
  var b64Ok = false
  var cryptoOk = false
  var runtimeErro = ''
  try {
    b64Ok = Buffer.from('bia', 'base64').length === 2
  } catch (err) {
    runtimeErro += 'Buffer: ' + String(err).substring(0, 80) + ' '
  }
  try {
    var c = require('crypto')
    cryptoOk = typeof c.createSign === 'function'
  } catch (err) {
    runtimeErro += 'crypto: ' + String(err).substring(0, 80)
  }

  var ativo = false
  try {
    var rc = $app.findFirstRecordByFilter('app_controls', "key = 'bia_voice_reply_active'")
    ativo = rc.getBool('is_active')
  } catch (_) {}

  var modo = apiKey ? 'chave_api' : saOk ? 'conta_servico' : 'nenhuma'

  return e.json(200, {
    credencial_ok: !!apiKey || saOk,
    modo_credencial: modo,
    conta_servico: saEmail,
    projeto: saProjeto,
    erro_conta_servico: saErro,
    voz: voz,
    runtime: { buffer_base64: b64Ok, crypto: cryptoOk, erro: runtimeErro },
    resposta_em_voz_ativa: ativo,
    pronto: (!!apiKey || saOk) && ativo,
    nota:
      !!apiKey || saOk
        ? ativo
          ? 'Bia responde em voz quando o cliente manda áudio.'
          : 'Credencial OK. Responder em voz está DESLIGADO até o Mauro aprovar o timbre.'
        : 'Falta a credencial do Google (GOOGLE_TTS_API_KEY).',
  })
})

routerAdd('GET', '/backend/v1/bia/voice/voices', (e) => {
  var apiKey = ''
  try {
    apiKey = String($secrets.get('GOOGLE_TTS_API_KEY') || '').trim()
  } catch (_) {}

  var token = ''
  if (apiKey) {
    token = apiKey
  } else {
    var raw = ''
    try {
      raw = String($secrets.get('GOOGLE_TTS_SA_JSON') || '').trim()
    } catch (_) {}
    if (!raw) return e.json(400, { ok: false, erro: 'configure GOOGLE_TTS_API_KEY' })
    var sa = null
    try {
      sa = JSON.parse(raw)
    } catch (_) {
      return e.json(400, { ok: false, erro: 'JSON da conta de serviço inválido' })
    }
    var crypto = null
    try {
      crypto = require('crypto')
    } catch (err) {
      return e.json(500, { ok: false, erro: 'crypto indisponível' })
    }
    function b64u(x) {
      return Buffer.from(x)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    }
    var now = Math.floor(Date.now() / 1000)
    var si =
      b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
      '.' +
      b64u(
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
      sg = b64u(sr.sign(String(sa.private_key)))
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
      return e.json(502, {
        ok: false,
        status: tk ? tk.statusCode : 0,
        erro: 'Google recusou o token',
      })
    }
    token = tk.json.access_token
  }

  var res = null
  try {
    res = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/voices?languageCode=pt-BR',
      method: 'GET',
      headers: apiKey ? { 'X-Goog-Api-Key': apiKey } : { Authorization: 'Bearer ' + token },
      timeout: 30,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }
  if (!res || res.statusCode !== 200 || !res.json) {
    var m = ''
    try {
      if (res && res.json && res.json.error && res.json.error.message)
        m = String(res.json.error.message).substring(0, 220)
    } catch (_) {}
    return e.json(502, {
      ok: false,
      status: res ? res.statusCode : 0,
      erro: m || 'falha ao listar vozes',
    })
  }

  var vs = (res.json && res.json.voices) || []
  var out = []
  for (var i = 0; i < vs.length; i++) {
    var v = vs[i] || {}
    var n = String(v.name || '')
    out.push({
      voz: n,
      genero: v.ssmlGender || '',
      chirp: n.indexOf('Chirp3-HD') !== -1,
      taxa: v.naturalSampleRateHertz || 0,
    })
  }
  out.sort(function (a, b) {
    if (a.chirp !== b.chirp) return a.chirp ? -1 : 1
    return a.voz < b.voz ? -1 : 1
  })
  return e.json(200, { ok: true, total: out.length, vozes: out })
})

routerAdd('GET', '/backend/v1/bia/voice/sample', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var apiKey = ''
  var vozSalva = ''
  try {
    apiKey = String($secrets.get('GOOGLE_TTS_API_KEY') || '').trim()
  } catch (_) {}
  try {
    vozSalva = String($secrets.get('GOOGLE_TTS_VOICE') || '').trim()
  } catch (_) {}

  var voz = String(q.voice || vozSalva || 'pt-BR-Chirp3-HD-Kore').trim()
  if (!/^pt-BR-[A-Za-z0-9-]+$/.test(voz)) {
    return e.json(400, { ok: false, erro: 'voz inválida: use algo como pt-BR-Chirp3-HD-Kore' })
  }

  var texto =
    String(q.text || '').trim() ||
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. ' +
      'Eu cuido dos lançamentos e dos imóveis de terceiros aqui em Florianópolis e região. ' +
      'Me conta o que você procura, que eu te mostro as opções que realmente combinam com você.'
  if (texto.length > 4000) texto = texto.substring(0, 4000)

  var enc = q.format === 'mp3' ? 'MP3' : 'OGG_OPUS'

  // ---- cabeçalho de autenticação
  var authHeader = null
  var token = ''
  if (apiKey) {
    authHeader = { 'X-Goog-Api-Key': apiKey }
  } else {
    var raw = ''
    try {
      raw = String($secrets.get('GOOGLE_TTS_SA_JSON') || '').trim()
    } catch (_) {}
    if (!raw) return e.json(400, { ok: false, erro: 'configure GOOGLE_TTS_API_KEY' })
    var sa = null
    try {
      sa = JSON.parse(raw)
    } catch (_) {
      return e.json(400, { ok: false, erro: 'JSON inválido' })
    }
    var crypto = null
    try {
      crypto = require('crypto')
    } catch (_) {
      return e.json(500, { ok: false, erro: 'crypto indisponível' })
    }
    function b64s(x) {
      return Buffer.from(x)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    }
    var n0 = Math.floor(Date.now() / 1000)
    var s0 =
      b64s(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
      '.' +
      b64s(
        JSON.stringify({
          iss: sa.client_email,
          scope: 'https://www.googleapis.com/auth/cloud-platform',
          aud: 'https://oauth2.googleapis.com/token',
          exp: n0 + 3600,
          iat: n0,
        }),
      )
    var g0 = ''
    try {
      var sgn = crypto.createSign('RSA-SHA256')
      sgn.update(s0)
      g0 = b64s(sgn.sign(String(sa.private_key)))
    } catch (_) {
      return e.json(500, { ok: false, erro: 'falha ao assinar JWT' })
    }
    var tk0 = null
    try {
      tk0 = $http.send({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:
          'grant_type=' +
          encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
          '&assertion=' +
          encodeURIComponent(s0 + '.' + g0),
        timeout: 30,
      })
    } catch (err) {
      return e.json(502, { ok: false, erro: String(err) })
    }
    if (!tk0 || tk0.statusCode !== 200 || !tk0.json || !tk0.json.access_token) {
      return e.json(502, { ok: false, status: tk0 ? tk0.statusCode : 0, erro: 'token recusado' })
    }
    token = tk0.json.access_token
    authHeader = { Authorization: 'Bearer ' + token }
  }
  authHeader['Content-Type'] = 'application/json'

  var syn = null
  try {
    syn = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        input: { text: texto },
        voice: { languageCode: 'pt-BR', name: voz },
        audioConfig: {
          audioEncoding: enc,
          sampleRateHertz: enc === 'OGG_OPUS' ? 48000 : 24000,
          speakingRate: Number(q.rate || 0.95),
          pitch: Number(q.pitch || 0),
        },
      }),
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
      erro: em || 'síntese recusada',
      voz: voz,
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
  if (texto.length > 4000) texto = texto.substring(0, 4000)

  var apiKey = ''
  var voz = ''
  try {
    apiKey = String($secrets.get('GOOGLE_TTS_API_KEY') || '').trim()
  } catch (_) {}
  try {
    voz = String($secrets.get('GOOGLE_TTS_VOICE') || '').trim()
  } catch (_) {}
  if (String(b.voice || '').trim()) voz = String(b.voice).trim()
  if (!voz) voz = 'pt-BR-Chirp3-HD-Kore'
  if (!/^pt-BR-[A-Za-z0-9-]+$/.test(voz)) return e.json(400, { ok: false, erro: 'voz inválida' })

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

  // autenticação Google
  var authHeader = null
  if (apiKey) {
    authHeader = { 'X-Goog-Api-Key': apiKey }
  } else {
    var raw = ''
    try {
      raw = String($secrets.get('GOOGLE_TTS_SA_JSON') || '').trim()
    } catch (_) {}
    if (!raw) return e.json(400, { ok: false, erro: 'configure GOOGLE_TTS_API_KEY' })
    var sa = null
    try {
      sa = JSON.parse(raw)
    } catch (_) {
      return e.json(400, { ok: false, erro: 'JSON inválido' })
    }
    var crypto = null
    try {
      crypto = require('crypto')
    } catch (_) {
      return e.json(500, { ok: false, erro: 'crypto indisponível' })
    }
    function b64v(x) {
      return Buffer.from(x)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    }
    var n1 = Math.floor(Date.now() / 1000)
    var s1 =
      b64v(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
      '.' +
      b64v(
        JSON.stringify({
          iss: sa.client_email,
          scope: 'https://www.googleapis.com/auth/cloud-platform',
          aud: 'https://oauth2.googleapis.com/token',
          exp: n1 + 3600,
          iat: n1,
        }),
      )
    var g1 = ''
    try {
      var sgn2 = crypto.createSign('RSA-SHA256')
      sgn2.update(s1)
      g1 = b64v(sgn2.sign(String(sa.private_key)))
    } catch (_) {
      return e.json(500, { ok: false, erro: 'falha ao assinar JWT' })
    }
    var tk1 = null
    try {
      tk1 = $http.send({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:
          'grant_type=' +
          encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
          '&assertion=' +
          encodeURIComponent(s1 + '.' + g1),
        timeout: 30,
      })
    } catch (err) {
      return e.json(502, { ok: false, etapa: 'token', erro: String(err) })
    }
    if (!tk1 || tk1.statusCode !== 200 || !tk1.json || !tk1.json.access_token) {
      return e.json(502, {
        ok: false,
        etapa: 'token',
        status: tk1 ? tk1.statusCode : 0,
        erro: 'Google recusou o token',
      })
    }
    authHeader = { Authorization: 'Bearer ' + tk1.json.access_token }
  }
  authHeader['Content-Type'] = 'application/json'

  // 1) síntese em OGG_OPUS (formato de nota de voz)
  var syn = null
  try {
    syn = $http.send({
      url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        input: { text: texto },
        voice: { languageCode: 'pt-BR', name: voz },
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
    return e.json(500, { ok: false, etapa: 'decode', erro: 'falha ao decodificar' })
  }
  if (!audio || !audio.length)
    return e.json(502, { ok: false, etapa: 'decode', erro: 'áudio vazio' })
  if (audio.length > 900000)
    return e.json(500, { ok: false, erro: 'áudio grande demais para nota de voz' })

  // 2) upload para a Meta (multipart byte a byte)
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

  // appsecret_proof: a Meta recusa chamadas de servidor sem assinatura.
  // O projeto já usa $security.hs256 para isso no readiness.
  var proof = ''
  try {
    var appSecret = user.getString('meta_app_secret') || ''
    if (!appSecret) appSecret = user.getString('meta_instagram_app_secret') || ''
    if (!appSecret) appSecret = String($os.getenv('META_APP_SECRET') || '')
    if (appSecret && waToken) {
      proof = '?appsecret_proof=' + $security.hs256(String(waToken), String(appSecret))
    }
  } catch (_) {}

  var up = null
  try {
    up = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneId + '/media' + proof,
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
    var upBody = ''
    try {
      if (up && up.json) upBody = JSON.stringify(up.json).substring(0, 600)
      else if (up && typeof up.body === 'string') upBody = up.body.substring(0, 600)
      else if (up && up.body && up.body.length) {
        upBody = String.fromCharCode.apply(null, Array.prototype.slice.call(up.body, 0, 600))
      }
    } catch (_) {}
    return e.json(502, {
      ok: false,
      etapa: 'upload',
      status: up ? up.statusCode : 0,
      erro: 'Meta não devolveu media id',
      resposta_meta: upBody,
      diag: {
        boundary_len: boundary.length,
        head_len: hb.length,
        audio_len: audio.length,
        tail_len: tb.length,
        buf_len: buf.length,
        buf_buffer_bytes: buf.buffer ? buf.buffer.byteLength : -1,
        head_preview: head.substring(0, 180),
        tem_proof: proof.length > 0,
        url_usada: 'https://graph.facebook.com/v21.0/' + phoneId + '/media' + proof,
      },
    })
  }

  // 3) enviar como nota de voz
  var sendRes = null
  try {
    sendRes = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneId + '/messages' + proof,
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
        voz: voz,
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
    voz: voz,
    audio_bytes: audio.length,
    status_meta: sendRes ? sendRes.statusCode : 0,
  })
})

// ============================================================================
// VOZ DA BIA — BRF IMÓVEIS
//
// Perfil pedido pelo Mauro: aveludada, executiva, agradável ao ouvido.
// Provedor: ElevenLabs (único com timbre "aveludado/executivo" e saída
// Opus 48 kHz, que é o que o WhatsApp exige para virar NOTA DE VOZ de verdade).
//
// Rotas:
//   GET  /backend/v1/bia/voice/status   -> está configurada? qual voz? (não gasta)
//   GET  /backend/v1/bia/voice/voices   -> lista as vozes disponíveis na conta
//   GET/POST /backend/v1/bia/voice/sample?voice_id=...&text=...
//                                        -> devolve o ÁUDIO (para o Mauro ouvir)
//   POST /backend/v1/bia/voice/say      -> sintetiza e envia nota de voz no WhatsApp
//
// IMPORTANTE: no Skip Cloud cada handler é extraído sem o escopo do arquivo,
// então cada handler é autossuficiente (nenhuma função auxiliar no topo).
//
// Segredos usados (nunca ficam no código):
//   ELEVENLABS_API_KEY   -> chave da conta de voz
//   ELEVENLABS_VOICE_ID  -> a voz aprovada pelo Mauro
//   ELEVENLABS_MODEL     -> opcional; padrão eleven_multilingual_v2
// ============================================================================

// ---------------------------------------------------------------------------
// STATUS — diz se a voz está pronta, sem gastar crédito nenhum
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

  var key = sec('ELEVENLABS_API_KEY')
  var voiceId = sec('ELEVENLABS_VOICE_ID')
  var model = sec('ELEVENLABS_MODEL') || 'eleven_multilingual_v2'

  var ativo = false
  var motivo = ''
  try {
    var rc = $app.findFirstRecordByFilter('app_controls', "key = 'bia_voice_reply_active'")
    ativo = rc.getBool('is_active')
  } catch (_) {
    motivo = 'controle bia_voice_reply_active ainda não existe (padrão: desligado)'
  }

  return e.json(200, {
    chave_configurada: key.length > 0,
    voz_definida: voiceId.length > 0,
    voz_id: voiceId ? voiceId.substring(0, 12) + '…' : '',
    modelo: model,
    resposta_em_voz_ativa: ativo,
    usa_controle: 'app_controls.bia_voice_reply_active',
    nota:
      motivo ||
      (ativo
        ? 'Bia responde em voz quando o cliente manda áudio.'
        : 'Desligado: Bia só responde por texto até o Mauro aprovar a voz.'),
    pronto: key.length > 0 && voiceId.length > 0,
  })
})

// ---------------------------------------------------------------------------
// VOICES — lista as vozes da conta para o Mauro escolher o timbre
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/bia/voice/voices', (e) => {
  var key = ''
  try {
    key = String($secrets.get('ELEVENLABS_API_KEY') || '').trim()
  } catch (_) {}
  if (!key) return e.json(400, { ok: false, erro: 'ELEVENLABS_API_KEY não configurada' })

  var res = null
  try {
    res = $http.send({
      url: 'https://api.elevenlabs.io/v1/voices',
      method: 'GET',
      headers: { 'xi-api-key': key },
      timeout: 30,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }
  if (!res || res.statusCode !== 200 || !res.json) {
    return e.json(502, {
      ok: false,
      status: res ? res.statusCode : 0,
      erro: 'a ElevenLabs recusou a listagem de vozes',
    })
  }

  var list = (res.json && res.json.voices) || []
  var out = []
  for (var i = 0; i < list.length; i++) {
    var v = list[i] || {}
    out.push({
      voice_id: v.voice_id || '',
      name: v.name || '',
      categoria: v.category || '',
      descricao: v.description || '',
      rotulos: v.labels || {},
    })
  }
  return e.json(200, { ok: true, total: out.length, vozes: out })
})

// ---------------------------------------------------------------------------
// SAMPLE — devolve o áudio cru para o Mauro ESCUTAR e aprovar
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/bia/voice/sample', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var key = ''
  var defaultVoice = ''
  try {
    key = String($secrets.get('ELEVENLABS_API_KEY') || '').trim()
  } catch (_) {}
  try {
    defaultVoice = String($secrets.get('ELEVENLABS_VOICE_ID') || '').trim()
  } catch (_) {}

  if (!key) return e.json(400, { ok: false, erro: 'ELEVENLABS_API_KEY não configurada' })

  var voiceId = String(q.voice_id || defaultVoice || '').trim()
  if (!voiceId) return e.json(400, { ok: false, erro: 'informe voice_id' })
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(voiceId))
    return e.json(400, { ok: false, erro: 'voice_id inválido' })

  var texto =
    String(q.text || '').trim() ||
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. ' +
      'Eu cuido dos lançamentos e dos imóveis de terceiros aqui em Florianópolis e região. ' +
      'Me conta o que você procura, que eu te mostro as opções que realmente combinam com você.'

  // Ajustes de timbre para soar aveludada e executiva, sem pressa de vendedora.
  var payload = {
    text: texto.substring(0, 2500),
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true,
    },
  }

  var fmt = q.format === 'mp3' ? 'mp3_44100_128' : 'opus_48000_64'
  var res = null
  try {
    res = $http.send({
      url: 'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=' + fmt,
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 90,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }

  if (!res || res.statusCode !== 200) {
    var em = ''
    try {
      if (res && res.json && res.json.detail) em = JSON.stringify(res.json.detail).substring(0, 300)
    } catch (_) {}
    return e.json(502, {
      ok: false,
      status: res ? res.statusCode : 0,
      erro: em || 'a ElevenLabs recusou a síntese',
      voice_id: voiceId,
    })
  }

  var bytes = res.body
  if (!bytes || !bytes.length) return e.json(502, { ok: false, erro: 'áudio vazio' })

  return e.blob(200, q.format === 'mp3' ? 'audio/mpeg' : 'audio/ogg', bytes)
})

routerAdd('POST', '/backend/v1/bia/voice/sample', (e) => {
  var b = {}
  try {
    b = e.requestInfo().body || {}
  } catch (_) {}

  var key = ''
  var defaultVoice = ''
  try {
    key = String($secrets.get('ELEVENLABS_API_KEY') || '').trim()
  } catch (_) {}
  try {
    defaultVoice = String($secrets.get('ELEVENLABS_VOICE_ID') || '').trim()
  } catch (_) {}
  if (!key) return e.json(400, { ok: false, erro: 'ELEVENLABS_API_KEY não configurada' })

  var voiceId = String(b.voice_id || defaultVoice || '').trim()
  if (!voiceId || !/^[A-Za-z0-9_-]{6,40}$/.test(voiceId)) {
    return e.json(400, { ok: false, erro: 'voice_id inválido' })
  }

  var texto =
    String(b.text || '').trim() ||
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. ' +
      'Me conta o que você procura, que eu te mostro as opções que combinam com você.'

  var payload = {
    text: texto.substring(0, 2500),
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: Number(b.stability || 0.45),
      similarity_boost: Number(b.similarity_boost || 0.8),
      style: Number(b.style || 0.3),
      use_speaker_boost: true,
    },
  }

  var fmt = b.format === 'mp3' ? 'mp3_44100_128' : 'opus_48000_64'
  var res = null
  try {
    res = $http.send({
      url: 'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=' + fmt,
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 90,
    })
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }
  if (!res || res.statusCode !== 200) {
    return e.json(502, { ok: false, status: res ? res.statusCode : 0, erro: 'síntese recusada' })
  }
  var bytes = res.body
  if (!bytes || !bytes.length) return e.json(502, { ok: false, erro: 'áudio vazio' })
  return e.blob(200, b.format === 'mp3' ? 'audio/mpeg' : 'audio/ogg', bytes)
})

// ---------------------------------------------------------------------------
// SAY — sintetiza e envia NOTA DE VOZ no WhatsApp
// Body: { to: "5548999999999", text: "...", voice_id?: "..." }
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

  var key = ''
  var voiceId = ''
  try {
    key = String($secrets.get('ELEVENLABS_API_KEY') || '').trim()
  } catch (_) {}
  try {
    voiceId = String($secrets.get('ELEVENLABS_VOICE_ID') || '').trim()
  } catch (_) {}
  if (String(b.voice_id || '').trim()) voiceId = String(b.voice_id).trim()
  if (!key) return e.json(400, { ok: false, erro: 'ELEVENLABS_API_KEY não configurada' })
  if (!voiceId) return e.json(400, { ok: false, erro: 'ELEVENLABS_VOICE_ID não configurada' })

  // Credenciais do WhatsApp (as mesmas que a Bia já usa)
  var user = null
  try {
    var users = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
    if (users && users.length) user = users[0]
  } catch (_) {}
  if (!user) return e.json(500, { ok: false, erro: 'usuário do CRM não encontrado' })

  var waToken = user.getString('meta_whatsapp_access_token') || ''
  var phoneId = user.getString('meta_whatsapp_phone_number_id') || ''
  if (!waToken || !phoneId) {
    return e.json(400, { ok: false, erro: 'credenciais do WhatsApp ausentes' })
  }

  // 1) Sintetizar em Opus 48 kHz (formato que vira nota de voz no WhatsApp)
  var ttsRes = null
  try {
    ttsRes = $http.send({
      url:
        'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=opus_48000_64',
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: texto.substring(0, 2500),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
      timeout: 90,
    })
  } catch (err) {
    return e.json(502, { ok: false, etapa: 'tts', erro: String(err) })
  }
  if (!ttsRes || ttsRes.statusCode !== 200 || !ttsRes.body || !ttsRes.body.length) {
    return e.json(502, {
      ok: false,
      etapa: 'tts',
      status: ttsRes ? ttsRes.statusCode : 0,
      erro: 'síntese recusada',
    })
  }
  var audio = ttsRes.body
  if (audio.length > 900000)
    return e.json(500, { ok: false, erro: 'áudio grande demais para nota de voz' })

  // 2) Subir o áudio para a Meta (multipart montado byte a byte)
  var boundary = '----BiaVoice' + $security.randomString(24)
  function bs(s) {
    var out = []
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff)
    return out
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

  var headBytes = bs(head)
  var tailBytes = bs(tail)
  var total = headBytes.length + audio.length + tailBytes.length
  var buf = new Uint8Array(total)
  var off = 0
  buf.set(new Uint8Array(headBytes), off)
  off += headBytes.length
  buf.set(audio instanceof Uint8Array ? audio : new Uint8Array(audio), off)
  off += audio.length
  buf.set(new Uint8Array(tailBytes), off)

  var upRes = null
  try {
    upRes = $http.send({
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
  var mediaId = upRes && upRes.json && upRes.json.id ? String(upRes.json.id) : ''
  if (!mediaId) {
    return e.json(502, {
      ok: false,
      etapa: 'upload',
      status: upRes ? upRes.statusCode : 0,
      erro: 'a Meta não devolveu media id',
    })
  }

  // 3) Enviar como nota de voz (voice: true)
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
    audio_bytes: audio.length,
    status_meta: sendRes ? sendRes.statusCode : 0,
  })
})

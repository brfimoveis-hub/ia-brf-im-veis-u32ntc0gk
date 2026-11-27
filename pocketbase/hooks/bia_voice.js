// ============================================================================
// VOZ DA BIA — BRF IMÓVEIS
// Rotas:
//   GET  /backend/v1/bia/voice/probe    -> descobre qual motor/voz o gateway aceita
//   GET  /backend/v1/bia/voice/sample   -> devolve o ÁUDIO pronto para o Mauro ouvir
//   POST /backend/v1/bia/voice/sample   -> idem
//
// Nada aqui envia mensagem a cliente. É só síntese de voz.
// ============================================================================

// A MESMA resolução de chave/host que o webhook já usa para transcrever áudio
// (whisper). Se a transcrição funciona, este host está, por construção, certo.
function biaVoiceBase() {
  var base =
    $os.getenv('SKIP_AI_BROKER_URL') ||
    $os.getenv('SKIP_AI_CHAT_URL') ||
    $os.getenv('SKIP_AI_GATEWAY_URL') ||
    'https://api.openai.com'
  return String(base).replace(/\/+$/, '')
}

function biaVoiceKey() {
  var k =
    $os.getenv('OPENAI_API_KEY') ||
    $os.getenv('SKIP_AI_BROKER_API_KEY') ||
    $os.getenv('SKIP_AI_CHAT_API_KEY') ||
    $os.getenv('SKIP_AI_GATEWAY_API_KEY') ||
    ''
  if (!k && typeof $secrets !== 'undefined' && $secrets.has && $secrets.has('OPENAI_API_KEY')) {
    k = $secrets.get('OPENAI_API_KEY') || ''
  }
  return String(k || '')
}

// Perfil de voz pedido pelo Mauro: aveludada, executiva, agradável ao ouvido.
// As instruções só valem no modelo gpt-4o-mini-tts; nos tts-1* elas são ignoradas.
var BIA_VOICE_PROFILE = {
  voice: 'nova',
  instructions:
    'Voz feminina brasileira, aveludada e executiva. Timbre macio, grave na medida, ' +
    'dicção impecável. Ritmo calmo e confiante, sem pressa, sem cantarolar. ' +
    'Tom acolhedor de consultora de alto padrão, nunca vendedora insistente. ' +
    'Pausas naturais nas vírgulas. Pronuncie os números de forma clara.',
}

// Combinações tentadas em ordem: da mais rica para a mais simples.
var BIA_VOICE_CANDIDATES = [
  { model: 'gpt-4o-mini-tts', voice: 'nova', fmt: 'opus' },
  { model: 'gpt-4o-mini-tts', voice: 'nova', fmt: 'mp3' },
  { model: 'tts-1-hd', voice: 'nova', fmt: 'opus' },
  { model: 'tts-1-hd', voice: 'nova', fmt: 'mp3' },
  { model: 'tts-1', voice: 'nova', fmt: 'mp3' },
]

function biaVoiceSynthesize(text, opts) {
  opts = opts || {}
  var base = biaVoiceBase()
  var key = biaVoiceKey()
  if (!key) {
    return { ok: false, status: 0, error: 'chave de IA ausente no runtime' }
  }

  var candidates = opts.model
    ? [{ model: opts.model, voice: opts.voice || BIA_VOICE_PROFILE.voice, fmt: opts.fmt || 'mp3' }]
    : BIA_VOICE_CANDIDATES

  var attempts = []
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i]
    var payload = {
      model: c.model,
      voice: opts.voice || c.voice,
      input: String(text || '').substring(0, 4000),
      response_format: c.fmt,
    }
    // Instruções de estilo: só o modelo novo entende
    if (String(c.model).indexOf('gpt-4o') === 0) {
      payload.instructions = opts.instructions || BIA_VOICE_PROFILE.instructions
    }

    var res = null
    try {
      res = $http.send({
        url: base + '/v1/audio/speech',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 60,
      })
    } catch (err) {
      attempts.push({ model: c.model, fmt: c.fmt, status: 0, error: String(err) })
      continue
    }

    var status = res ? res.statusCode : 0
    var body = res ? res.body : null
    var len = body && body.length ? body.length : 0

    if (status === 200 && len > 200) {
      attempts.push({ model: c.model, fmt: c.fmt, status: status, bytes: len, ok: true })
      return {
        ok: true,
        bytes: body,
        contentType: c.fmt === 'opus' ? 'audio/ogg' : 'audio/mpeg',
        format: c.fmt,
        model: c.model,
        voice: payload.voice,
        attempts: attempts,
      }
    }

    var errText = ''
    try {
      if (res && res.json && res.json.error) {
        errText = res.json.error.message || JSON.stringify(res.json.error)
      } else if (res && typeof res.body === 'string') {
        errText = String(res.body).substring(0, 220)
      } else if (body && body.length) {
        errText = String.fromCharCode.apply(null, Array.prototype.slice.call(body, 0, 220))
      }
    } catch (_) {}
    attempts.push({ model: c.model, fmt: c.fmt, status: status, bytes: len, error: errText })
  }

  return { ok: false, attempts: attempts, error: 'nenhum modelo de voz respondeu 200' }
}

function handleVoiceProbe(e) {
  var out = {
    base_host: biaVoiceBase()
      .replace(/^https?:\/\//, '')
      .split('/')[0],
    tem_chave: !!biaVoiceKey(),
    perfil: BIA_VOICE_PROFILE.voice,
  }
  var r = biaVoiceSynthesize('Teste de voz da Bia, BRF Imóveis.', {})
  out.ok = !!r.ok
  out.attempts = r.attempts || []
  if (r.ok) {
    out.escolhido = { model: r.model, voice: r.voice, format: r.format, bytes: r.bytes.length }
  } else {
    out.erro = r.error
  }
  return e.json(200, out)
}

function handleVoiceSample(e) {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var text =
    String(body.text || q.text || '').trim() ||
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. ' +
      'Eu cuido dos lançamentos e dos imóveis de terceiros aqui em Florianópolis e região. ' +
      'Me conta o que você procura, que eu te mostro as opções que realmente combinam com você.'

  var r = biaVoiceSynthesize(text, {
    model: body.model || q.model || '',
    voice: body.voice || q.voice || '',
    fmt: body.format || q.format || '',
  })

  if (!r.ok) return e.json(502, { ok: false, attempts: r.attempts, erro: r.error })
  return e.blob(200, r.contentType, r.bytes)
}

routerAdd('GET', '/backend/v1/bia/voice/probe', handleVoiceProbe)
routerAdd('POST', '/backend/v1/bia/voice/probe', handleVoiceProbe)
routerAdd('GET', '/backend/v1/bia/voice/sample', handleVoiceSample)
routerAdd('POST', '/backend/v1/bia/voice/sample', handleVoiceSample)

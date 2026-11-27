// ============================================================================
// VOZ DA BIA — BRF IMÓVEIS
//
// Rotas:
//   GET/POST /backend/v1/bia/voice/probe   -> testa qual motor de voz responde
//   GET/POST /backend/v1/bia/voice/sample  -> devolve o ÁUDIO para o Mauro ouvir
//
// IMPORTANTE: no Skip Cloud cada handler de rota é extraído para o runtime
// SEM o escopo do arquivo. Por isso cada handler é autossuficiente: nada de
// funções auxiliares no topo do arquivo.
//
// Nada aqui envia mensagem a cliente. É só síntese de voz.
// ============================================================================

routerAdd('GET', '/backend/v1/bia/voice/probe', (e) => {
  var BIA_VOICE_INSTRUCTIONS =
    'Voz feminina brasileira, aveludada e executiva. Timbre macio e acolhedor, ' +
    'grave na medida, dicção impecável. Ritmo calmo e confiante, sem pressa, ' +
    'sem cantarolar. Tom de consultora de alto padrão, nunca de vendedora ' +
    'insistente. Pausas naturais nas vírgulas e nos pontos. Números sempre claros.'
  // ---- resolução de credenciais (mesma lógica da transcrição que já funciona)
  var base =
    $os.getenv('SKIP_AI_BROKER_URL') ||
    $os.getenv('SKIP_AI_CHAT_URL') ||
    $os.getenv('SKIP_AI_GATEWAY_URL') ||
    'https://api.openai.com'
  base = String(base).replace(/\/+$/, '')

  var key =
    $os.getenv('OPENAI_API_KEY') ||
    $os.getenv('SKIP_AI_BROKER_API_KEY') ||
    $os.getenv('SKIP_AI_CHAT_API_KEY') ||
    $os.getenv('SKIP_AI_GATEWAY_API_KEY') ||
    ''
  if (!key && typeof $secrets !== 'undefined' && $secrets.has && $secrets.has('OPENAI_API_KEY')) {
    key = $secrets.get('OPENAI_API_KEY') || ''
  }
  key = String(key || '')

  var out = {
    host: base.replace(/^https?:\/\//, '').split('/')[0],
    tem_chave: key.length > 0,
    tentativas: [],
  }
  if (!key) {
    out.ok = false
    out.erro = 'sem chave de IA no runtime'
    return e.json(200, out)
  }

  var candidates = [
    { model: 'gpt-4o-mini-tts', voice: 'nova', fmt: 'opus' },
    { model: 'gpt-4o-mini-tts', voice: 'nova', fmt: 'mp3' },
    { model: 'tts-1-hd', voice: 'nova', fmt: 'opus' },
    { model: 'tts-1-hd', voice: 'nova', fmt: 'mp3' },
    { model: 'tts-1', voice: 'nova', fmt: 'mp3' },
  ]

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i]
    var payload = {
      model: c.model,
      voice: c.voice,
      input: 'Teste de voz da Bia, da BRF Imóveis.',
      response_format: c.fmt,
    }
    if (String(c.model).indexOf('gpt-4o') === 0) payload.instructions = BIA_VOICE_INSTRUCTIONS

    var status = 0
    var bytes = 0
    var errMsg = ''
    try {
      var res = $http.send({
        url: base + '/v1/audio/speech',
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 60,
      })
      status = res ? res.statusCode : 0
      bytes = res && res.body && res.body.length ? res.body.length : 0
      if (status !== 200) {
        try {
          if (res && res.json && res.json.error)
            errMsg = String(res.json.error.message || JSON.stringify(res.json.error))
          else if (res && typeof res.body === 'string') errMsg = String(res.body).substring(0, 200)
        } catch (_) {}
      }
    } catch (err) {
      errMsg = String(err)
    }

    out.tentativas.push({
      model: c.model,
      formato: c.fmt,
      status: status,
      bytes: bytes,
      erro: errMsg,
    })
    if (status === 200 && bytes > 200) {
      out.ok = true
      out.escolhido = { model: c.model, voice: c.voice, formato: c.fmt, bytes: bytes }
      return e.json(200, out)
    }
  }

  out.ok = false
  out.erro = 'nenhum modelo de voz respondeu 200'
  return e.json(200, out)
})

routerAdd('POST', '/backend/v1/bia/voice/probe', (e) => {
  var BIA_VOICE_INSTRUCTIONS =
    'Voz feminina brasileira, aveludada e executiva. Timbre macio e acolhedor, ' +
    'grave na medida, dicção impecável. Ritmo calmo e confiante, sem pressa, ' +
    'sem cantarolar. Tom de consultora de alto padrão, nunca de vendedora ' +
    'insistente. Pausas naturais nas vírgulas e nos pontos. Números sempre claros.'
  var base =
    $os.getenv('SKIP_AI_BROKER_URL') ||
    $os.getenv('SKIP_AI_CHAT_URL') ||
    $os.getenv('SKIP_AI_GATEWAY_URL') ||
    'https://api.openai.com'
  base = String(base).replace(/\/+$/, '')
  var key =
    $os.getenv('OPENAI_API_KEY') ||
    $os.getenv('SKIP_AI_BROKER_API_KEY') ||
    $os.getenv('SKIP_AI_CHAT_API_KEY') ||
    $os.getenv('SKIP_AI_GATEWAY_API_KEY') ||
    ''
  key = String(key || '')
  var out = { host: base.replace(/^https?:\/\//, '').split('/')[0], tem_chave: key.length > 0 }
  if (!key) {
    out.ok = false
    out.erro = 'sem chave de IA no runtime'
    return e.json(200, out)
  }
  var candidates = [
    { model: 'gpt-4o-mini-tts', voice: 'nova', fmt: 'opus' },
    { model: 'tts-1-hd', voice: 'nova', fmt: 'mp3' },
  ]
  out.tentativas = []
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i]
    var payload = {
      model: c.model,
      voice: c.voice,
      input: 'Teste de voz da Bia.',
      response_format: c.fmt,
    }
    if (String(c.model).indexOf('gpt-4o') === 0) payload.instructions = BIA_VOICE_INSTRUCTIONS
    var status = 0
    var bytes = 0
    var errMsg = ''
    try {
      var res = $http.send({
        url: base + '/v1/audio/speech',
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 60,
      })
      status = res ? res.statusCode : 0
      bytes = res && res.body && res.body.length ? res.body.length : 0
      if (status !== 200) {
        try {
          if (res && res.json && res.json.error)
            errMsg = String(res.json.error.message || JSON.stringify(res.json.error))
        } catch (_) {}
      }
    } catch (err) {
      errMsg = String(err)
    }
    out.tentativas.push({
      model: c.model,
      formato: c.fmt,
      status: status,
      bytes: bytes,
      erro: errMsg,
    })
    if (status === 200 && bytes > 200) {
      out.ok = true
      out.escolhido = { model: c.model, voice: c.voice, formato: c.fmt, bytes: bytes }
      return e.json(200, out)
    }
  }
  out.ok = false
  out.erro = 'nenhum modelo de voz respondeu 200'
  return e.json(200, out)
})

routerAdd('GET', '/backend/v1/bia/voice/sample', (e) => {
  var BIA_VOICE_INSTRUCTIONS =
    'Voz feminina brasileira, aveludada e executiva. Timbre macio e acolhedor, ' +
    'grave na medida, dicção impecável. Ritmo calmo e confiante, sem pressa, ' +
    'sem cantarolar. Tom de consultora de alto padrão, nunca de vendedora ' +
    'insistente. Pausas naturais nas vírgulas e nos pontos. Números sempre claros.'
  var BIA_VOICE_DEFAULT_TEXT =
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. Eu cuido dos ' +
    'lançamentos e dos imóveis de terceiros aqui em Florianópolis e região. ' +
    'Me conta o que você procura, que eu te mostro as opções que realmente ' +
    'combinam com você.'
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var base =
    $os.getenv('SKIP_AI_BROKER_URL') ||
    $os.getenv('SKIP_AI_CHAT_URL') ||
    $os.getenv('SKIP_AI_GATEWAY_URL') ||
    'https://api.openai.com'
  base = String(base).replace(/\/+$/, '')
  var key =
    $os.getenv('OPENAI_API_KEY') ||
    $os.getenv('SKIP_AI_BROKER_API_KEY') ||
    $os.getenv('SKIP_AI_CHAT_API_KEY') ||
    $os.getenv('SKIP_AI_GATEWAY_API_KEY') ||
    ''
  key = String(key || '')
  if (!key) return e.json(500, { ok: false, erro: 'sem chave de IA no runtime' })

  var text = String(q.text || '').trim() || BIA_VOICE_DEFAULT_TEXT
  var wantVoice = q.voice && /^[a-z0-9_-]+$/i.test(q.voice) ? String(q.voice) : 'nova'
  var wantFmt = q.format === 'mp3' ? 'mp3' : 'opus'

  var payload = {
    model: 'gpt-4o-mini-tts',
    voice: wantVoice,
    input: text.substring(0, 4000),
    response_format: wantFmt,
    instructions: BIA_VOICE_INSTRUCTIONS,
  }

  var res = null
  var status = 0
  try {
    res = $http.send({
      url: base + '/v1/audio/speech',
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 90,
    })
    status = res ? res.statusCode : 0
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }

  if (status !== 200) {
    var em = ''
    try {
      if (res && res.json && res.json.error) em = String(res.json.error.message || '')
    } catch (_) {}
    return e.json(502, { ok: false, status: status, erro: em || 'motor de voz recusou' })
  }

  var bytes = res && res.body ? res.body : null
  if (!bytes || !bytes.length) return e.json(502, { ok: false, erro: 'áudio vazio' })

  return e.blob(200, wantFmt === 'opus' ? 'audio/ogg' : 'audio/mpeg', bytes)
})

routerAdd('POST', '/backend/v1/bia/voice/sample', (e) => {
  var BIA_VOICE_INSTRUCTIONS =
    'Voz feminina brasileira, aveludada e executiva. Timbre macio e acolhedor, ' +
    'grave na medida, dicção impecável. Ritmo calmo e confiante, sem pressa, ' +
    'sem cantarolar. Tom de consultora de alto padrão, nunca de vendedora ' +
    'insistente. Pausas naturais nas vírgulas e nos pontos. Números sempre claros.'
  var BIA_VOICE_DEFAULT_TEXT =
    'Oi! Aqui é a Bia, da BRF Imóveis. Que bom te encontrar. Eu cuido dos ' +
    'lançamentos e dos imóveis de terceiros aqui em Florianópolis e região. ' +
    'Me conta o que você procura, que eu te mostro as opções que realmente ' +
    'combinam com você.'
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var base =
    $os.getenv('SKIP_AI_BROKER_URL') ||
    $os.getenv('SKIP_AI_CHAT_URL') ||
    $os.getenv('SKIP_AI_GATEWAY_URL') ||
    'https://api.openai.com'
  base = String(base).replace(/\/+$/, '')
  var key =
    $os.getenv('OPENAI_API_KEY') ||
    $os.getenv('SKIP_AI_BROKER_API_KEY') ||
    $os.getenv('SKIP_AI_CHAT_API_KEY') ||
    $os.getenv('SKIP_AI_GATEWAY_API_KEY') ||
    ''
  key = String(key || '')
  if (!key) return e.json(500, { ok: false, erro: 'sem chave de IA no runtime' })

  var text = String(body.text || '').trim() || BIA_VOICE_DEFAULT_TEXT
  var wantVoice =
    body.voice && /^[a-z0-9_-]+$/i.test(String(body.voice)) ? String(body.voice) : 'nova'
  var wantFmt = body.format === 'mp3' ? 'mp3' : 'opus'
  var instructions = String(body.instructions || '').trim() || BIA_VOICE_INSTRUCTIONS

  var payload = {
    model: 'gpt-4o-mini-tts',
    voice: wantVoice,
    input: text.substring(0, 4000),
    response_format: wantFmt,
    instructions: instructions,
  }

  var res = null
  var status = 0
  try {
    res = $http.send({
      url: base + '/v1/audio/speech',
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 90,
    })
    status = res ? res.statusCode : 0
  } catch (err) {
    return e.json(502, { ok: false, erro: String(err) })
  }

  if (status !== 200) {
    var em = ''
    try {
      if (res && res.json && res.json.error) em = String(res.json.error.message || '')
    } catch (_) {}
    return e.json(502, { ok: false, status: status, erro: em || 'motor de voz recusou' })
  }

  var bytes = res && res.body ? res.body : null
  if (!bytes || !bytes.length) return e.json(502, { ok: false, erro: 'áudio vazio' })

  return e.blob(200, wantFmt === 'opus' ? 'audio/ogg' : 'audio/mpeg', bytes)
})

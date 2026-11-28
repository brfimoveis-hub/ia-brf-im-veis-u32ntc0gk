// TEMPORÁRIO — sonda de diagnóstico (remover depois)
routerAdd('POST', '/backend/v1/bia/voice/probe', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var out = {}
  var keys = {}
  try {
    keys.openai = !!String($os.getenv('OPENAI_API_KEY') || '')
  } catch (_) {
    keys.openai = 'erro'
  }
  try {
    keys.broker_url = String($os.getenv('SKIP_AI_BROKER_URL') || 'vazio')
  } catch (_) {}
  try {
    keys.broker_key = !!String($os.getenv('SKIP_AI_BROKER_API_KEY') || '')
  } catch (_) {}
  try {
    keys.chat_key = !!String($os.getenv('SKIP_AI_CHAT_API_KEY') || '')
  } catch (_) {}
  try {
    keys.gw_key = !!String($os.getenv('SKIP_AI_GATEWAY_API_KEY') || '')
  } catch (_) {}
  try {
    keys.secret_openai =
      typeof $secrets !== 'undefined' && $secrets.has && $secrets.has('OPENAI_API_KEY')
  } catch (_) {}
  out.chaves = keys
  out.query = q
  out.tem_body = !!(e.requestInfo().body && e.requestInfo().body.length)

  // testa o gateway de transcrição com um arquivo pequeno real
  if (String(q.t || '') === 'whisper') {
    try {
      var b64 = String(q.b64 || '')
      if (!b64) {
        try {
          var raw = e.requestInfo().body
          if (raw && raw.length) {
            b64 = ''
            var CH = 8192
            var parts = []
            for (var bi = 0; bi < raw.length; bi += CH) {
              var end = Math.min(bi + CH, raw.length)
              var sub = raw.subarray ? raw.subarray(bi, end) : raw.slice(bi, end)
              parts.push(String.fromCharCode.apply(null, sub))
            }
            b64 = btoa(parts.join(''))
          }
        } catch (rbErr) {}
      }
      if (!b64) return e.json(200, { ok: false, erro: 'sem b64' })
      var bin = ''
      try {
        bin = atob(b64)
      } catch (_) {
        return e.json(200, { ok: false, erro: 'b64 invalido' })
      }
      var bytes = new Uint8Array(bin.length)
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

      var key = String($os.getenv('OPENAI_API_KEY') || '')
      if (!key) {
        try {
          key = $secrets.get('OPENAI_API_KEY') || ''
        } catch (_) {}
      }
      var base = String(
        $os.getenv('SKIP_AI_BROKER_URL') ||
          $os.getenv('SKIP_AI_CHAT_URL') ||
          $os.getenv('SKIP_AI_GATEWAY_URL') ||
          'https://api.openai.com',
      ).replace(/\/+$/, '')
      if (base.indexOf('://') === -1) base = 'http://' + base

      var boundary = '----B' + $security.randomString(16)
      var head =
        '--' +
        boundary +
        '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n' +
        '--' +
        boundary +
        '\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n' +
        '--' +
        boundary +
        '\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'
      var foot = '\r\n--' + boundary + '--\r\n'

      var headBytes = new Uint8Array(head.length)
      for (var h = 0; h < head.length; h++) headBytes[h] = head.charCodeAt(h)
      var footBytes = new Uint8Array(foot.length)
      for (var f = 0; f < foot.length; f++) footBytes[f] = foot.charCodeAt(f)

      var total = headBytes.length + bytes.length + footBytes.length
      var payload = new Uint8Array(total)
      payload.set(headBytes, 0)
      payload.set(bytes, headBytes.length)
      payload.set(footBytes, headBytes.length + bytes.length)

      var res = $http.send({
        url: base + '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
        },
        body: payload.buffer,
        timeout: 60,
      })
      out.whisper = {
        base: base,
        status: res ? res.statusCode : 'none',
        body: String((res && (res.json ? JSON.stringify(res.json) : res.body)) || '').substring(
          0,
          500,
        ),
      }
    } catch (err) {
      out.whisper = { erro: String(err).substring(0, 300) }
    }
  }

  return e.json(200, out)
})

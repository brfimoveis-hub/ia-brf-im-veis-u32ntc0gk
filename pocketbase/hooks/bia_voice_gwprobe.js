// ============================================================================
// SONDA TEMPORÁRIA — o que o gateway de IA do projeto oferece (modelos e rotas)
// Rota: GET /backend/v1/bia/voice/gwprobe
// Só leitura/diagnóstico. Não envia nada a cliente.
// ============================================================================

routerAdd('GET', '/backend/v1/bia/voice/gwprobe', (e) => {
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

  var paths = [
    '/v1/models',
    '/models',
    '/v1/audio/models',
    '/health',
    '/v1/audio/voices',
    '/v1/voices',
  ]
  var out = []
  for (var i = 0; i < paths.length; i++) {
    var status = 0
    var snippet = ''
    try {
      var res = $http.send({
        url: base + paths[i],
        method: 'GET',
        headers: { Authorization: 'Bearer ' + key },
        timeout: 20,
      })
      status = res ? res.statusCode : 0
      if (res) {
        if (typeof res.body === 'string') snippet = res.body.substring(0, 600)
        else if (res.body && res.body.length) {
          try {
            snippet = String.fromCharCode.apply(null, Array.prototype.slice.call(res.body, 0, 600))
          } catch (_) {
            snippet = '[' + res.body.length + ' bytes]'
          }
        }
      }
    } catch (err) {
      snippet = 'ERR ' + String(err)
    }
    out.push({ path: paths[i], status: status, body: snippet })
  }

  return e.json(200, { host: base.replace(/^https?:\/\//, '').split('/')[0], sondas: out })
})

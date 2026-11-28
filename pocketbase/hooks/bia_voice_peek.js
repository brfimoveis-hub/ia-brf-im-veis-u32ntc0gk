// TEMPORÁRIO: leitor do bundle em runtime para inspeção (será bloqueado depois)
// GET /backend/v1/bia/voice/peek?search=Sending%20WhatsApp&antes=300&depois=900
routerAdd('GET', '/backend/v1/bia/voice/peek', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}

  var base = String(q.base || '/data/ia-uazapi-6d79e')
  var nome = String(q.file || 'ai_auto_reply.js')
  var bruto = String(q.raw || '')
  if (bruto) {
    // procura direto no arquivo do repositório dentro do pod
    nome = bruto
  }
  var busca = String(q.search || '')
  var antes = parseInt(String(q.antes || '300'), 10)
  var depois = parseInt(String(q.depois || '900'), 10)
  var deByte = parseInt(String(q.de || '0'), 10)
  var take = parseInt(String(q.take || '0'), 10)
  if (take > 8000) take = 8000

  var caminho = base + (base.slice(-1) === '/' ? '' : '/') + nome
  var bytes = null
  try {
    var f = $filesystem.fileFromPath(caminho)
    bytes = f.bytes ? f.bytes() : null
    if (!bytes) return e.json(200, { ok: false, erro: 'sem bytes', caminho: caminho })
  } catch (err) {
    return e.json(200, { ok: false, erro: String(err).substring(0, 200), caminho: caminho })
  }

  // fatia bruta
  if (take > 0) {
    var ini = Math.max(0, Math.min(deByte, bytes.length))
    var fim = Math.min(bytes.length, ini + take)
    var pedaco = ''
    for (var i = ini; i < fim; i++) pedaco += String.fromCharCode(bytes[i])
    return e.json(200, {
      ok: true,
      caminho: caminho,
      total: bytes.length,
      de: ini,
      ate: fim,
      trecho: pedaco,
    })
  }

  if (!busca) {
    return e.json(200, {
      ok: true,
      caminho: caminho,
      total: bytes.length,
      aviso: 'informe search ou take',
    })
  }

  // procura todas as ocorrências
  var texto = ''
  for (var k = 0; k < bytes.length; k++) texto += String.fromCharCode(bytes[k])
  var achados = []
  var pos = texto.indexOf(busca)
  while (pos !== -1 && achados.length < 12) {
    achados.push(pos)
    pos = texto.indexOf(busca, pos + busca.length)
  }
  var blocos = []
  for (var a = 0; a < achados.length; a++) {
    var p = achados[a]
    var s = Math.max(0, p - antes)
    var t = Math.min(texto.length, p + busca.length + depois)
    blocos.push({
      pos: p,
      linha: texto.substring(0, p).split('\n').length,
      trecho: texto.substring(s, t),
    })
  }
  return e.json(200, {
    ok: true,
    caminho: caminho,
    total: bytes.length,
    ocorrencias: achados.length,
    blocos: blocos,
  })
})

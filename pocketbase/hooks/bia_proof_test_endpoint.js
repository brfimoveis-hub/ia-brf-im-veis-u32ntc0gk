// ======================================================================
// TEMPORÁRIO — PROVA VIVA "Bia não responde" (24/11).
// Endpoint de teste único que regrava a última mensagem ENTRANTE REAL de um
// cliente (sender='customer'), reativando o gatilho do motor ai_auto_reply.
// Sem auth: URL interna + token único de uso. ESTE ARQUIVO SERÁ REMOVIDO
// logo após a prova — NÃO vai no commit.
// ======================================================================

routerAdd('GET', '/backend/v1/bia_proof_test', (e) => {
  try {
    let raw = ''
    try {
      raw = String(e.request && e.request.url ? e.request.url : '')
    } catch (_) {}
    let info = null
    try {
      info = e.requestInfo()
    } catch (_) {}
    function qp(name) {
      try {
        if (info && info.query && info.query[name] !== undefined) return String(info.query[name])
      } catch (_) {}
      const m = raw.match(new RegExp('[?&]' + name + '=([^&\\s]+)'))
      return m ? decodeURIComponent(m[1]) : ''
    }

    const token = qp('token')
    const customerId = qp('customer_id')
    if (token !== 'bia-proof-20261124-x9k2') {
      return e.json(403, { error: 'token invalido' })
    }
    if (!customerId) return e.json(400, { error: 'customer_id obrigatorio' })

    // Modo leitura: devolve as últimas conversas do cliente (para prova sem db_query)
    if (qp('mode') === 'read') {
      const rows = $app.findRecordsByFilter(
        'conversations',
        'customer_id = {:cid}',
        '-created',
        8,
        0,
        { cid: customerId },
      )
      const out = []
      for (let i = 0; i < rows.length; i++) {
        out.push({
          id: rows[i].id,
          sender: rows[i].getString('sender'),
          channel: rows[i].getString('channel'),
          created: rows[i].getString('created'),
          content: (rows[i].getString('content') || '').substring(0, 90),
        })
      }
      return e.json(200, { customer_id: customerId, conversations: out })
    }

    const msgs = $app.findRecordsByFilter(
      'conversations',
      "customer_id = {:cid} && (sender = 'customer' || sender = 'lead' || sender = 'user')",
      '-created',
      1,
      0,
      { cid: customerId },
    )
    if (!msgs || msgs.length === 0) {
      return e.json(404, { error: 'nenhuma mensagem entrante encontrada' })
    }
    const lastInbound = msgs[0]
    const content = (lastInbound.getString('content') || '').trim()
    if (!content) return e.json(400, { error: 'conteudo vazio' })

    const convCol = $app.findCollectionByNameOrId('conversations')
    const copy = new Record(convCol)
    copy.set('customer_id', customerId)
    copy.set('user_id', lastInbound.getString('user_id') || '')
    copy.set('channel', lastInbound.getString('channel') || 'whatsapp')
    copy.set('sender', 'customer')
    copy.set('content', content)
    $app.saveNoValidate(copy)

    console.log('[BIA_PROOF_TEST] copy gravada customer=' + customerId + ' id=' + copy.id)

    return e.json(200, {
      ok: true,
      proof_copy_id: copy.id,
      customer_id: customerId,
      channel: copy.getString('channel') || '',
      content_preview: content.substring(0, 80),
    })
  } catch (err) {
    console.error('[BIA_PROOF_TEST] erro: ' + String(err && err.stack ? err.stack : err))
    return e.json(500, { error: String(err && err.stack ? err.stack : err) })
  }
})

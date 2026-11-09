// ============================================================================
// CONVITE VISTAGE + LANDING PAGE (Mauro — 3 partes)
//
// Parte 1: rota pública POST /backend/v1/landing-lead que grava o lead no CRM
//          (coleção customers + conversa de entrada) a partir do formulário da
//          landing page do Vistage Residence Barreiros.
//
// Parte 3: disparo do CONVITE com o link da landing page — IMPLEMENTADO PORÉM
//          PAUSADO (app_controls key 'convite_vistage', is_active=false).
//   - Painel de ativação: /settings/convite (frontend).
//   - Regras respeitadas: janela de envio 8h–18h (America/Sao_Paulo);
//     ordem alfabética começando na letra 'a' (cursor por nome);
//     degrau avança só com mensagem entregue (falha NÃO avança o cursor e é
//     reagendada automaticamente na próxima rodada dentro da janela);
//     nunca disparo retroativo em massa (lote pequeno por rodada);
//     nunca WhatsApp/push externo (envio apenas pela WABA oficial do CRM).
//   - Meta policy (App Review): contato cuja última conversa é Messenger/
//     Instagram Direct NÃO recebe o envio promocional fora da janela de 24h —
//     registrado como 'fora da janela' e pulado.
// ============================================================================

var CONVITE_CONTROL_KEY = 'convite_vistage'

// Texto do convite definido pelo Mauro (com as correções de digitação óbvias).
var CONVITE_MENSAGEM_PADRAO =
  'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.'

function ensureConviteControl(app) {
  try {
    return app.findFirstRecordByFilter('app_controls', "key = '" + CONVITE_CONTROL_KEY + "'")
  } catch (_) {
    try {
      var col = app.findCollectionByNameOrId('app_controls')
      var rec = new Record(col)
      rec.set('key', CONVITE_CONTROL_KEY)
      rec.set('name', 'Disparo do Convite Vistage (com link da landing page)')
      rec.set('is_active', false)
      rec.set(
        'description',
        'PAUSADO por padrão. Ativar SOMENTE pelo painel /settings/convite depois que o Mauro aprovar a landing page.',
      )
      rec.set(
        'metadata',
        JSON.stringify({
          mensagem: CONVITE_MENSAGEM_PADRAO,
          link: '',
          cursor_nome: '',
          total_enviados: 0,
          pausado_por_padrao: true,
        }),
      )
      app.saveNoValidate(rec)
      return rec
    } catch (err2) {
      console.warn('[CONVITE_VISTAGE] Falha ao criar controle: ' + String(err2))
      return null
    }
  }
}

function conviteNormalizePhone(raw) {
  var digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits
  }
  if (digits.length === 12 && digits.indexOf('55') !== 0) {
    digits = '55' + digits
  }
  return digits
}

function conviteGetFirstUser(app) {
  try {
    var users = app.findRecordsByFilter('users', '', 'created', 1, 0)
    if (users && users.length > 0) return users[0]
  } catch (_) {}
  return null
}

// ============================================================================
// PARTE 1 — LEAD PÚBLICO DA LANDING PAGE
// ============================================================================
routerAdd('POST /backend/v1/landing-lead', (e) => {
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  var nome = String(body.name || body.nome || '').trim()
  var fone = String(body.phone || body.whatsapp || body.telefone || '').trim()
  var msg = String(body.message || body.mensagem || '').trim()

  if (nome.length < 2) {
    e.json(400, { ok: false, error: 'Informe seu nome.' })
    return
  }
  var digits = conviteNormalizePhone(fone)
  if (digits.length < 10) {
    e.json(400, { ok: false, error: 'Informe um WhatsApp válido com DDD.' })
    return
  }

  var userRec = conviteGetFirstUser($app)

  // Dedup por telefone: se já existe, apenas confirma (sem duplicar cadastro).
  try {
    var existing = $app.findFirstRecordByFilter('customers', "phone = '" + digits + "'")
    if (existing) {
      e.json(200, { ok: true, duplicated: true })
      return
    }
  } catch (_) {}

  try {
    var custCol = $app.findCollectionByNameOrId('customers')
    var cust = new Record(custCol)
    cust.set('name', nome)
    var first = nome.split(' ')[0] || nome
    cust.set('first_name', first)
    cust.set('phone', digits)
    cust.set('source', 'landing_vistage')
    cust.set('last_origin', 'landing_vistage')
    cust.set('tags', ['landing_vistage'])
    $app.saveNoValidate(cust)

    // Conversa de entrada para a régua/Bia assumirem naturalmente depois.
    try {
      var convCol = $app.findCollectionByNameOrId('conversations')
      var conv = new Record(convCol)
      conv.set('customer_id', cust.id)
      conv.set('user_id', userRec ? userRec.id : '')
      conv.set('sender', 'customer')
      conv.set('channel', 'whatsapp')
      conv.set(
        'content',
        msg ||
          'Lead recebido pela landing page do Vistage Residence Barreiros (formulário de interesse).',
      )
      $app.saveNoValidate(conv)
    } catch (convErr) {
      console.warn('[CONVITE_VISTAGE] Falha ao gravar conversa do lead: ' + String(convErr))
    }

    e.json(200, { ok: true, id: cust.id })
  } catch (err) {
    console.error('[CONVITE_VISTAGE] Falha ao gravar lead da landing: ' + String(err))
    e.json(500, { ok: false, error: 'Não foi possível registrar agora. Tente novamente.' })
  }
})

// ============================================================================
// PARTE 3 — CRON DO DISPARO DO CONVITE (PAUSADO por padrão)
// ============================================================================
cronAdd('*/15 * * * *', () => {
  var ctrl = ensureConviteControl($app)
  if (!ctrl) return

  // ESTADO FINAL: PAUSADO — nada sai enquanto is_active=false (padrão).
  if (!ctrl.getBool('is_active')) {
    return
  }

  var meta = {}
  try {
    meta = JSON.parse(ctrl.getString('metadata') || '{}') || {}
  } catch (_) {
    meta = {}
  }

  var mensagem = String(meta.mensagem || CONVITE_MENSAGEM_PADRAO)
  var link = String(meta.link || '').trim()
  if (!link) {
    console.warn(
      '[CONVITE_VISTAGE] Disparo ativo mas sem link da landing page no painel. Nada enviado.',
    )
    return
  }

  // Janela de envio 8h–18h (horário de Brasília).
  var now = new Date()
  var brHour = new Date(now.getTime() - 3 * 3600 * 1000).getUTCHours()
  if (brHour < 8 || brHour >= 18) {
    return
  }

  var userRec = null
  try {
    var wabaUsers = $app.findRecordsByFilter(
      'users',
      "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
      '',
      1,
      0,
    )
    if (wabaUsers && wabaUsers.length > 0) userRec = wabaUsers[0]
  } catch (_) {}
  if (!userRec) {
    console.warn('[CONVITE_VISTAGE] WABA do CRM não configurada. Nada enviado.')
    return
  }
  var wabaToken = userRec.getString('meta_whatsapp_access_token')
  var wabaPhoneId = userRec.getString('meta_whatsapp_phone_number_id')

  var cursor = String(meta.cursor_nome || '')
  var filter = "phone != '' && is_blocked = false && name != ''"
  if (cursor) {
    filter += " && name > '" + cursor.replace(/'/g, "\\'") + "'"
  }

  var batch = []
  try {
    // Ordem alfabética a partir da letra 'a' (cursor avança nome a nome).
    batch = $app.findRecordsByFilter('customers', filter, 'name', 15, 0)
  } catch (bErr) {
    console.warn('[CONVITE_VISTAGE] Erro ao buscar lote: ' + String(bErr))
    return
  }
  if (!batch || batch.length === 0) {
    console.log('[CONVITE_VISTAGE] Fila alfabética concluída ou vazia nesta rodada.')
    return
  }

  var oneDayMs = 24 * 3600 * 1000
  var nowMs = now.getTime()
  var sent = 0
  var newCursor = cursor
  var totalEnviados = parseInt(String(meta.total_enviados || '0'), 10) || 0

  for (var i = 0; i < batch.length; i++) {
    var c = batch[i]
    var cName = c.getString('name')
    var cTagsRaw = c.get('tags') || []
    var cTags = []
    if (Array.isArray(cTagsRaw)) {
      for (var t = 0; t < cTagsRaw.length; t++) {
        if (typeof cTagsRaw[t] === 'string') cTags.push(cTagsRaw[t])
      }
    }
    var tagsStr = (cTags.join('|') + '|').toLowerCase()

    // Já processado ou pausado pelo Mauro? Avança o cursor.
    if (tagsStr.indexOf('convite_vistage_enviado') !== -1) {
      newCursor = cName
      continue
    }
    if (tagsStr.indexOf('ai_paused') !== -1 || tagsStr.indexOf('frio') !== -1) {
      continue
    }

    // Canal da última conversa: Messenger/Instagram Direct => Meta policy 24h.
    var lastConvs = []
    try {
      lastConvs = $app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + c.id + "'",
        '-created',
        5,
        0,
      )
    } catch (_) {}

    var lastChannel = ''
    var lastCustMsgMs = 0
    for (var k = 0; k < lastConvs.length; k++) {
      var cv = lastConvs[k]
      if (!lastChannel) lastChannel = String(cv.getString('channel') || 'whatsapp')
      if (String(cv.getString('sender') || '') === 'customer' && lastCustMsgMs === 0) {
        var dStr = cv.getString('created') || cv.get('created')
        if (dStr) lastCustMsgMs = new Date(dStr).getTime()
      }
    }

    if (lastChannel === 'messenger' || lastChannel === 'instagram') {
      // Envio promocional fora da janela de 24h viola a política declarada na
      // App Review: NÃO sai. Registra como 'fora da janela' e segue a fila.
      var inWindow = lastCustMsgMs > 0 && nowMs - lastCustMsgMs < oneDayMs
      try {
        var logsCol = $app.findCollectionByNameOrId('system_logs')
        var lg = new Record(logsCol)
        lg.set('type', inWindow ? 'convite_canal_meta' : 'convite_fora_janela')
        lg.set(
          'message',
          inWindow
            ? 'Convite Vistage NÃO enviado por Messenger/Instagram (janela 24h ativa, envio promocional apenas via WhatsApp). Cliente: ' +
                cName
            : 'Convite Vistage registrado como FORA DA JANELA de 24h (canal ' +
                lastChannel +
                '). Cliente: ' +
                cName,
        )
        lg.set('payload', JSON.stringify({ customer_id: c.id, channel: lastChannel }))
        $app.saveNoValidate(lg)
      } catch (_) {}
      cTags.push('convite_vistage_fora_janela')
      try {
        c.set('tags', cTags)
        $app.saveNoValidate(c)
      } catch (_) {}
      newCursor = cName
      continue
    }

    // Envio via WABA oficial do CRM (nunca WhatsApp/push externo).
    var toDigits = conviteNormalizePhone(c.getString('phone'))
    var fullText = mensagem + '\n\n' + link
    var res = null
    var sendOk = false
    var sendErr = ''
    try {
      res = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + wabaPhoneId + '/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + wabaToken,
        },
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toDigits,
          type: 'text',
          text: { preview_url: true, body: fullText },
        },
        timeout: 20,
      })
      if (res && res.statusCode >= 200 && res.statusCode < 300) {
        sendOk = true
      } else {
        var errObj = res && res.json && res.json.error ? res.json.error : {}
        sendErr =
          'HTTP ' + (res ? res.statusCode : 'n/a') + (errObj.message ? ' — ' + errObj.message : '')
      }
    } catch (httpErr) {
      sendErr = 'Exceção: ' + String(httpErr)
    }

    if (sendOk) {
      // DEGRAU SÓ AVANÇA COM MENSAGEM ENTREGUE: cursor avança aqui.
      cTags.push('convite_vistage_enviado')
      try {
        c.set('tags', cTags)
        c.set('last_sent_at', new Date().toISOString().replace('T', ' ').substring(0, 19))
        $app.saveNoValidate(c)
      } catch (_) {}
      try {
        var convCol2 = $app.findCollectionByNameOrId('conversations')
        var cv2 = new Record(convCol2)
        cv2.set('customer_id', c.id)
        cv2.set('user_id', userRec.id)
        cv2.set('sender', 'ai')
        cv2.set('channel', 'whatsapp')
        cv2.set('content', fullText)
        $app.saveNoValidate(cv2)
      } catch (_) {}
      newCursor = cName
      sent++
      totalEnviados++
      console.log('[CONVITE_VISTAGE] Convite entregue para ' + cName + ' (' + toDigits + ')')
    } else {
      // FALHA NÃO AVANÇA: reagendamento automático (a próxima rodada em janela
      // útil reprocessa o MESMO nome). Nada de disparo retroativo em massa.
      console.warn(
        '[CONVITE_VISTAGE] Falha no envio para ' +
          cName +
          '. Cursor NÃO avançou. Motivo: ' +
          sendErr,
      )
      try {
        var logsCol2 = $app.findCollectionByNameOrId('system_logs')
        var lg2 = new Record(logsCol2)
        lg2.set('type', 'convite_falha_envio')
        lg2.set('message', 'Falha no envio do Convite Vistage para ' + cName + ': ' + sendErr)
        lg2.set('payload', JSON.stringify({ customer_id: c.id, error: sendErr }))
        $app.saveNoValidate(lg2)
      } catch (_) {}
      break
    }
  }

  // Persiste cursor/estatística no controle.
  if (newCursor !== String(meta.cursor_nome || '') || sent > 0) {
    try {
      meta.cursor_nome = newCursor
      meta.total_enviados = totalEnviados
      ctrl.set('metadata', JSON.stringify(meta))
      $app.saveNoValidate(ctrl)
    } catch (mErr) {
      console.warn('[CONVITE_VISTAGE] Falha ao salvar cursor: ' + String(mErr))
    }
  }

  console.log(
    '[CONVITE_VISTAGE] Rodada concluída. Enviados nesta rodada: ' +
      sent +
      ' | total: ' +
      totalEnviados,
  )
})

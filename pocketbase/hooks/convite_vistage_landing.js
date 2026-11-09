// ============================================================================
// CONVITE VISTAGE + LANDING PAGE — v2 (hook idempotente, escopo 100% inline)
//
// Parte 1: rota pública POST /backend/v1/landing-lead que grava o lead no CRM
//          (coleção customers + conversa de entrada) a partir do formulário da
//          landing page do Vistage Residence Barreiros.
//
// Parte 3: disparo do CONVITE com o link da landing page — cron a cada 15 min,
//          SAI IMEDIATAMENTE se app_controls.key='convite_vistage' estiver
//          is_active=false (criado PAUSADO por padrão). Regras respeitadas:
//   - Janela de envio 8h–18h America/Sao_Paulo.
//   - Ordem alfabética por `name` começando na letra 'a' (cursor alfabético).
//   - Cursor só avança com envio OK; falha grava em system_logs e NÃO avança
//     (sem disparo retroativo em massa — lote pequeno por rodada).
//   - Canal Messenger/Instagram Direct fora da janela de 24h do Meta: o contato
//     é registrado como 'convite_vistage_fora_janela' e NÃO recebe promoção.
//   - Envio somente pela WABA oficial do CRM (credenciais do usuário do banco).
//
// IMPORTANTE (escopo JSVM PocketBase): nenhuma função ou constante top-level
// aqui — tudo inline dentro dos callbacks para evitar ReferenceError.
// ============================================================================

routerAdd('POST /backend/v1/landing-lead', (e) => {
  var app = $app
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
  var digits = String(fone).replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits
  }
  if (digits.length < 10) {
    e.json(400, { ok: false, error: 'Informe um WhatsApp válido com DDD.' })
    return
  }

  var userRec = null
  try {
    var users = app.findRecordsByFilter('users', '', 'created', 1, 0)
    if (users && users.length > 0) {
      userRec = users[0]
    }
  } catch (_) {}

  // Dedup por telefone: se já existe, apenas confirma (sem duplicar cadastro).
  try {
    var existing = app.findFirstRecordByFilter('customers', "phone = '" + digits + "'")
    if (existing) {
      e.json(200, { ok: true, duplicated: true })
      return
    }
  } catch (_) {}

  try {
    var custCol = app.findCollectionByNameOrId('customers')
    var cust = new Record(custCol)
    cust.set('name', nome)
    var first = (nome.split(' ')[0] || nome).trim()
    cust.set('first_name', first)
    cust.set('phone', digits)
    cust.set('status', 'novo')
    cust.set('phase', 'lead_landing')
    cust.set('source', 'landing_page')
    cust.set('is_blocked', false)
    if (userRec) {
      cust.set('user_id', userRec.id)
    }
    cust.set('tags', JSON.stringify(['landing_vistage']))
    app.saveNoValidate(cust)

    // Conversa de entrada para dar contexto à Bia
    try {
      var convCol = app.findCollectionByNameOrId('conversations')
      var conv = new Record(convCol)
      if (userRec) {
        conv.set('user_id', userRec.id)
      }
      conv.set('customer_id', cust.id)
      conv.set('sender', 'customer')
      conv.set('channel', 'landing_page')
      conv.set(
        'content',
        'Lead da landing page Vistage Residence: ' + (msg || nome + ' quer conhecer o lançamento.'),
      )
      app.saveNoValidate(conv)
    } catch (_) {}

    e.json(200, { ok: true, id: cust.id })
    return
  } catch (err) {
    console.error('[LANDING_LEAD] Falha ao gravar lead: ' + String(err))
    e.json(500, { ok: false, error: 'Falha ao gravar. Tente novamente.' })
    return
  }
})

cronAdd('convite_vistage_disparo', '*/15 * * * *', () => {
  var app = $app

  // ---- Controle: PAUSADO por padrão (cria se não existir) ----
  var ctrl = null
  try {
    ctrl = app.findFirstRecordByFilter('app_controls', "key = 'convite_vistage'")
  } catch (_) {
    ctrl = null
  }
  if (!ctrl) {
    try {
      var col = app.findCollectionByNameOrId('app_controls')
      var rec = new Record(col)
      rec.set('key', 'convite_vistage')
      rec.set('name', 'Disparo do Convite Vistage (com link da landing page)')
      rec.set('is_active', false)
      rec.set(
        'description',
        'PAUSADO por padrão. Ativar SOMENTE pelo painel após aprovação do Mauro.',
      )
      rec.set(
        'metadata',
        JSON.stringify({
          mensagem:
            'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.',
          link: '',
          cursor_nome: '',
          total_enviados: 0,
        }),
      )
      app.saveNoValidate(rec)
      ctrl = rec
    } catch (err2) {
      console.warn('[CONVITE_VISTAGE] Falha ao criar controle: ' + String(err2))
      return
    }
  }

  var isActive = false
  try {
    isActive = ctrl.getBool('is_active')
  } catch (_) {
    isActive = false
  }
  if (!isActive) {
    return
  }

  var meta = {}
  try {
    meta = JSON.parse(ctrl.getString('metadata') || '{}')
  } catch (_) {
    meta = {}
  }
  var landingLink = String(meta.link || '').trim()
  var mensagemPadrao =
    'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.'
  if (!landingLink) {
    console.warn('[CONVITE_VISTAGE] Ativo mas sem link da landing — saindo.')
    return
  }

  // ---- Janela 8h–18h America/Sao_Paulo ----
  var now = new Date()
  var brTime = new Date(now.getTime() - 3 * 3600000)
  var brHour = brTime.getHours()
  var brDay = brTime.getDay()
  if (brDay === 0 || brHour < 8 || brHour >= 18) {
    return
  }

  // ---- Credenciais WABA oficial do CRM ----
  var metaToken = ''
  var metaPhoneId = ''
  var activeUserId = ''
  try {
    var usersWithMeta = app.findRecordsByFilter(
      'users',
      "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
      '-created',
      1,
      0,
    )
    if (usersWithMeta && usersWithMeta.length > 0) {
      metaToken = (usersWithMeta[0].getString('meta_whatsapp_access_token') || '').trim()
      metaPhoneId = (usersWithMeta[0].getString('meta_whatsapp_phone_number_id') || '').trim()
      activeUserId = usersWithMeta[0].id
    }
  } catch (_) {}
  if (!metaToken || !metaPhoneId) {
    return
  }

  // ---- Cursor alfabético: começa na letra 'a' ----
  var cursorNome = String(meta.cursor_nome || '').trim()
  var filtro = cursorNome
    ? "name >= '" + cursorNome + "' && phone != '' && is_blocked = false"
    : "phone != '' && is_blocked = false"
  var candidates = []
  try {
    candidates = app.findRecordsByFilter('customers', filtro, 'name', 10, 0)
  } catch (fetchErr) {
    console.error('[CONVITE_VISTAGE] Falha ao buscar candidatos: ' + String(fetchErr))
    return
  }
  if (!candidates || candidates.length === 0) {
    return
  }

  var sentOk = 0
  var envioOkNome = ''
  for (var i = 0; i < candidates.length; i++) {
    var cust = candidates[i]
    var custId = cust.id
    var phoneDigits = String(cust.getString('phone') || '').replace(/\D/g, '')
    if (phoneDigits.length === 10 || phoneDigits.length === 11) {
      phoneDigits = '55' + phoneDigits
    }

    // Guarda 24h Meta — última conversa por Messenger/Instagram Direct: NÃO envia
    var lastConvChannel = ''
    try {
      var lastConv = app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + custId + "'",
        '-created',
        1,
        0,
      )
      if (lastConv && lastConv.length > 0) {
        lastConvChannel = (lastConv[0].getString('channel') || '').toLowerCase()
      }
    } catch (_) {}

    if (lastConvChannel === 'messenger' || lastConvChannel === 'instagram') {
      try {
        var logsColFJ = app.findCollectionByNameOrId('system_logs')
        var logFJ = new Record(logsColFJ)
        logFJ.set('user_id', activeUserId)
        logFJ.set('type', 'convite_vistage_fora_janela')
        logFJ.set(
          'message',
          'Contato ' +
            custId +
            ' fora da janela 24h Meta — sem disparo (canal: ' +
            lastConvChannel +
            ')',
        )
        app.saveNoValidate(logFJ)
      } catch (_) {}
      continue
    }

    var msgFull =
      'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.\n\n' +
      landingLink

    var okSend = false
    try {
      var res = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + metaPhoneId + '/messages',
        method: 'POST',
        headers: { Authorization: 'Bearer ' + metaToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneDigits,
          type: 'text',
          text: { preview_url: true, body: msgFull },
        }),
        timeout: 25,
      })
      if (res && res.statusCode >= 200 && res.statusCode < 300) {
        okSend = true
      }
    } catch (sendErr) {
      console.error('[CONVITE_VISTAGE] Erro de envio para ' + custId + ': ' + String(sendErr))
      okSend = false
    }

    if (okSend) {
      sentOk++
      envioOkNome = cust.getString('name')
      try {
        var convCol2 = app.findCollectionByNameOrId('conversations')
        var conv2 = new Record(convCol2)
        if (activeUserId) {
          conv2.set('user_id', activeUserId)
        }
        conv2.set('customer_id', custId)
        conv2.set('sender', 'ai')
        conv2.set('channel', 'whatsapp')
        conv2.set('content', msgFull)
        app.saveNoValidate(conv2)
      } catch (_) {}
      try {
        cust.set('last_follow_up_at', new Date().toISOString())
        app.saveNoValidate(cust)
      } catch (_) {}
    } else {
      // Falha: NÃO avança o cursor — registra e processa o mesmo nome na próxima rodada
      try {
        var logsCol2 = app.findCollectionByNameOrId('system_logs')
        var logFail = new Record(logsCol2)
        logFail.set('user_id', activeUserId)
        logFail.set('type', 'convite_vistage_falha')
        logFail.set(
          'message',
          'Falha no envio do convite para ' + custId + ' — cursor NÃO avança, será reprocessado',
        )
        app.saveNoValidate(logFail)
      } catch (_) {}
      break
    }

    // Lote pequeno por rodada (sem disparo retroativo em massa)
    if (sentOk >= 15) {
      break
    }
  }

  // ---- Avança cursor SÓ se houve envio OK nesta rodada ----
  // aponta para o PRÓXIMO nome depois do último enviado (senão reenvia para o mesmo)
  if (sentOk > 0 && envioOkNome) {
    var novoMeta = meta || {}
    var proximoNome = ''
    try {
      var proxRecs = app.findRecordsByFilter(
        'customers',
        "name > '" + String(envioOkNome).replace(/'/g, "''") + "' && phone != ''",
        'name',
        1,
        0,
      )
      if (proxRecs && proxRecs.length > 0) {
        proximoNome = proxRecs[0].getString('name')
      }
    } catch (_) {}
    novoMeta.cursor_nome = proximoNome
    novoMeta.ultimo_enviado_nome = envioOkNome
    novoMeta.total_enviados = (parseInt(novoMeta.total_enviados || 0, 10) || 0) + sentOk
    try {
      ctrl.set('metadata', JSON.stringify(novoMeta))
      app.saveNoValidate(ctrl)
    } catch (_) {}
  }
})

// ============================================================================
// CONVITE VISTAGE + LANDING PAGE — v3 (hook 100% inline, sem referências top-level)
//
// Parte 1: rota pública POST /backend/v1/landing-lead que grava o lead no CRM
//          (coleção customers + conversa de entrada) a partir do formulário da
//          landing page do Vistage Residence Barreiros.
//
// Parte 3: disparo do CONVITE com o link da landing page — cron a cada 15 min,
//          SAI IMEDIATAMENTE se app_controls.key='convite_vistage' estiver
//          is_active=false (criado PAUSADO por padrão). Regras respeitadas:
//   - Janela de envio 8h–18h America/Sao_Paulo (segunda a sábado, nunca domingo).
//   - Ordem alfabética por `name` (cursor alfabético) para TODOS os contatos (~6356).
//   - Disparo nasce DESLIGADO. Só liga manualmente pelo painel /configuracoes.
//   - Guarda de 24h Meta: contatos cuja última conversa é Messenger/Instagram
//     são registrados como 'convite_vistage_fora_janela' e NÃO recebem o disparo.
//   - Cursor só avança com envio OK; falha grava em system_logs e NÃO avança
//     (mantém o mesmo contato e registra erro visível, sem disparo retroativo em massa).
//   - Envio somente pela WABA oficial do CRM (credenciais do usuário do banco).
//
// REQUISITO TÉCNICO (JSVM PocketBase): nenhuma função auxiliar ou constante fora
// dos callbacks — tudo inline para garantir deploy 100% livre de ReferenceError.
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
  var email = String(body.email || '').trim()
  var msg = String(body.message || body.mensagem || '').trim()
  var campaignSource = String(body.campaign_source || body.source || 'landing_vistage').trim()

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

  // Dedup por telefone: se já existe, apenas confirma (sem duplicar cadastro)
  try {
    var existing = null
    try {
      existing = app.findFirstRecordByFilter('customers', "phone = '" + digits + "'")
    } catch (_) {}

    var cust = existing
    var isNew = false

    if (!cust) {
      isNew = true
      var custCol = app.findCollectionByNameOrId('customers')
      cust = new Record(custCol)
      cust.set('phone', digits)
      cust.set('status', 'novo')
      cust.set('phase', 'lead_landing')
      cust.set('is_blocked', false)
    }

    cust.set('name', nome)
    var first = (nome.split(' ')[0] || nome).trim()
    cust.set('first_name', first)
    if (email) {
      cust.set('email', email)
    }
    cust.set('source', campaignSource)
    if (userRec) {
      cust.set('user_id', userRec.id)
    }

    var existingTags = []
    try {
      var rawT = cust.get('tags')
      if (Array.isArray(rawT)) existingTags = rawT
      else if (typeof rawT === 'string' && rawT.startsWith('[')) existingTags = JSON.parse(rawT)
    } catch (_) {}

    if (!existingTags.includes(campaignSource)) existingTags.push(campaignSource)
    if (!existingTags.includes('lead_campanha')) existingTags.push('lead_campanha')
    cust.set('tags', JSON.stringify(existingTags))

    // Inicializa follow_up_step da campanha
    cust.set('follow_up_step', 'remarketing')
    app.saveNoValidate(cust)

    // Conversa de entrada do lead capturado
    var createdConvId = ''
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
        'Lead da landing page Vistage Residence (' +
          campaignSource +
          '): ' +
          (msg || nome + ' preencheu formulário e solicitou material/ebook do Vistage.'),
      )
      app.saveNoValidate(conv)
      createdConvId = conv.id
    } catch (_) {}

    // Resposta imediata da Bia com entrega do Ebook da campanha
    var ebookSent = false
    try {
      var convBia = new Record(app.findCollectionByNameOrId('conversations'))
      if (userRec) {
        convBia.set('user_id', userRec.id)
      }
      convBia.set('customer_id', cust.id)
      convBia.set('sender', 'bia')
      convBia.set('channel', 'whatsapp')
      var biaGreeting = first ? 'Olá, ' + first + '! ' : 'Olá! '
      convBia.set(
        'content',
        biaGreeting +
          'Aqui é a Bia, consultora da BRF Imóveis. Conforme solicitado na landing page do Vistage Residence, estou te encaminhando o material exclusivo do empreendimento com apresentação completa e plantas.\n\n' +
          '📖 Acesse o book digital: https://ia-uazapi-6d79e--preview.goskip.app/assets/vistage_ebook.pdf\n\n' +
          'Lembrando que os valores de referência partem de R$ 607.880 para 2 dormitórios e R$ 929.844 para 3 dormitórios (valores atualizados pelo CUB). Ficou com alguma dúvida sobre as plantas ou fluxo na planta com a AJ Coelho?',
      )
      app.saveNoValidate(convBia)
      ebookSent = true
    } catch (_) {}

    e.json(200, { ok: true, id: cust.id, isNew: isNew })
    return
  } catch (err) {
    console.error('[LANDING_LEAD] Falha ao processar lead da campanha: ' + String(err))
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

  // FIX 11/11: mensagem da campanha no formato do parser da régua —
  // saudação personalizada com o nome do cliente, nome correto do
  // empreendimento ("Residencial Vistage Residence", JAMAIS "Barreiros -
  // AJ Coelho"), link da landing page de PRODUÇÃO e o e-book oficial.
  var VISTAGE_LANDING_URL = 'https://brfiacrminteligente.goskip.app/lancamento/vistage'
  var VISTAGE_EBOOK_URL =
    'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'

  function buildConviteVistageMessage(customerName) {
    var first =
      String(customerName || '')
        .trim()
        .split(/\s+/)[0] || ''
    var nowBr = new Date(new Date().getTime() - 3 * 3600000)
    var periodo =
      nowBr.getUTCHours() < 12 ? 'bom dia' : nowBr.getUTCHours() < 18 ? 'boa tarde' : 'boa noite'
    var saudacao = first
      ? 'Olá, ' + first + '! ' + periodo + ', tudo bem?'
      : 'Olá! ' + periodo + ', tudo bem?'
    return (
      saudacao +
      ' Sou a Bia, da BRF Imóveis.\n\n' +
      'Como você já consta em nossos contatos, tomei a liberdade de trazer uma oportunidade: o Residencial Vistage Residence, o novo lançamento da AJ Coelho em Barreiros, em São José (SC).\n\n' +
      '📖 Separei o e-book completo do empreendimento, com plantas e diferenciais: ' +
      VISTAGE_EBOOK_URL +
      '\n\n' +
      '🏠 E montei uma página especial do lançamento — dá uma olhada e deixa seu contato por lá que eu mesma retomo o atendimento com você: ' +
      VISTAGE_LANDING_URL +
      '\n\n' +
      'Por ser lançamento, os valores de referência variam todo mês, atualizados pelo CUB — te apresento a tabela vigente quando você me responder por aqui.\n\n' +
      'Se não deseja mais receber novidades como esta, responda NÃO.'
    )
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
            'Mensagem da campanha gerada por buildConviteVistageMessage (parser da régua: saudação + Residencial Vistage Residence + e-book + landing page de produção).',
          link: VISTAGE_LANDING_URL,
          cursor_nome: '',
          ultimo_enviado_nome: '',
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
  // Guarda absoluta: se não ativo, sai sem fazer nenhuma operação
  if (!isActive) {
    return
  }

  var meta = {}
  try {
    meta = JSON.parse(ctrl.getString('metadata') || '{}')
  } catch (_) {
    meta = {}
  }
  // FIX 11/11: landing page de PRODUÇÃO sempre (metadados antigos guardavam
  // o link de preview — por isso o link errado saía nas mensagens)
  var landingLink = VISTAGE_LANDING_URL
  if (!landingLink) {
    console.warn('[CONVITE_VISTAGE] Ativo mas sem link da landing — saindo.')
    return
  }

  // ---- Janela 8h–18h America/Sao_Paulo (UTC-3) ----
  var now = new Date()
  var brTime = new Date(now.getTime() - 3 * 3600000)
  var brHour = brTime.getHours()
  var brDay = brTime.getDay()
  // Domingo (0) ou fora de 8h..17h59: não dispara
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
    console.warn('[CONVITE_VISTAGE] Credenciais da Meta WABA não configuradas em users.')
    return
  }

  // ---- Cursor alfabético para TODOS os contatos da base (~6356) ----
  // Se cursor_nome estiver vazio, inicia do começo da base
  var cursorNome = String(meta.cursor_nome || '').trim()
  var filtro = cursorNome
    ? "name >= '" + cursorNome.replace(/'/g, "''") + "' && phone != '' && is_blocked = false"
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
    if (phoneDigits.length < 10) {
      continue
    }

    // Guarda 24h Meta: se a última conversa foi Messenger ou Instagram, NÃO envia convite
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
        if (activeUserId) {
          logFJ.set('user_id', activeUserId)
        }
        logFJ.set('type', 'convite_vistage_fora_janela')
        logFJ.set(
          'message',
          'Contato ' +
            custId +
            ' fora da janela 24h Meta — convite não disparado (último canal: ' +
            lastConvChannel +
            ')',
        )
        app.saveNoValidate(logFJ)
      } catch (_) {}
      continue
    }

    var msgFull = buildConviteVistageMessage(cust.getString('name'))

    var okSend = false
    var errorDetails = ''
    try {
      var res = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + metaPhoneId + '/messages',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + metaToken,
          'Content-Type': 'application/json',
        },
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
      } else {
        errorDetails =
          'HTTP ' + (res ? res.statusCode : 0) + ': ' + (res ? res.raw : 'Sem resposta')
      }
    } catch (sendErr) {
      errorDetails = String(sendErr)
      okSend = false
    }

    if (okSend) {
      sentOk++
      envioOkNome = cust.getString('name')

      // Registra conversa no histórico
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

      // Atualiza last_follow_up_at do cliente
      try {
        cust.set('last_follow_up_at', new Date().toISOString())
        app.saveNoValidate(cust)
      } catch (_) {}

      // Log de sucesso
      try {
        var logsColOk = app.findCollectionByNameOrId('system_logs')
        var logOk = new Record(logsColOk)
        if (activeUserId) {
          logOk.set('user_id', activeUserId)
        }
        logOk.set('type', 'convite_vistage_sucesso')
        logOk.set(
          'message',
          'Convite enviado com sucesso para ' + (cust.getString('name') || custId),
        )
        app.saveNoValidate(logOk)
      } catch (_) {}
    } else {
      // Falha: cursor NÃO avança. Registra log para o painel de configurações e para a rodada
      try {
        var logsCol2 = app.findCollectionByNameOrId('system_logs')
        var logFail = new Record(logsCol2)
        if (activeUserId) {
          logFail.set('user_id', activeUserId)
        }
        logFail.set('type', 'convite_vistage_falha')
        logFail.set(
          'message',
          'Falha no envio para ' +
            (cust.getString('name') || custId) +
            ' (' +
            phoneDigits +
            '): ' +
            errorDetails +
            ' — cursor mantido',
        )
        app.saveNoValidate(logFail)
      } catch (_) {}
      break
    }

    // Limite prudente por ciclo de 15 min (máx 15 mensagens por rodada)
    if (sentOk >= 15) {
      break
    }
  }

  // ---- Avança cursor SÓ se houve envio OK nesta rodada ----
  // Aponta para o PRÓXIMO nome após o último enviado
  if (sentOk > 0 && envioOkNome) {
    var novoMeta = meta || {}
    var proximoNome = ''
    try {
      var proxRecs = app.findRecordsByFilter(
        'customers',
        "name > '" +
          String(envioOkNome).replace(/'/g, "''") +
          "' && phone != '' && is_blocked = false",
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

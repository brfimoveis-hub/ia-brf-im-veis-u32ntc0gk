// ============================================================================
// PRONTIDÃO PARA O PRIMEIRO ANÚNCIO META — BRF IMÓVEIS / BIA
// Rota: GET/POST /backend/v1/bia/meta_readiness
//
// Verifica, SEM ENVIAR NADA A CLIENTE, se o caminho completo do anúncio está
// de pé: credenciais, webhook, janela de 24h + template de abertura, CAPI,
// régua e cérebro da Bia (constituição ativa, contexto e lições).
//
// Cada item devolve status: 'ok' | 'warn' | 'fail' e o que fazer quando não ok.
// ============================================================================

function handleMetaReadiness(e) {
  var checks = []
  var startedAt = Date.now()

  function add(id, label, status, detail, action) {
    checks.push({
      id: id,
      label: label,
      status: status,
      detail: detail || '',
      action: action || '',
    })
  }

  // ------------------------------------------------------------------ usuário
  var user = null
  try {
    var users = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
    if (users && users.length > 0) user = users[0]
  } catch (_) {}

  if (!user) {
    add(
      'user',
      'Usuário do CRM',
      'fail',
      'Nenhum usuário encontrado na base.',
      'Criar/entrar com o usuário da BRF.',
    )
    return e.json(200, { ok: false, checks: checks, duracao_ms: Date.now() - startedAt })
  }

  // ------------------------------------------------------------ WhatsApp/Cloud
  var waToken = ''
  var waPhoneId = ''
  try {
    waToken = (user.getString('meta_whatsapp_access_token') || '').trim()
    waPhoneId = (user.getString('meta_whatsapp_phone_number_id') || '').trim()
  } catch (_) {}

  if (!waToken) {
    add(
      'wa_token',
      'WhatsApp Cloud API — token',
      'fail',
      'meta_whatsapp_access_token vazio.',
      'Conectar o WhatsApp oficial em Configurações > Conexões.',
    )
  } else if (!waPhoneId) {
    add(
      'wa_token',
      'WhatsApp Cloud API — token',
      'fail',
      'Token existe, mas meta_whatsapp_phone_number_id está vazio.',
      'Preencher o Phone Number ID do número oficial.',
    )
  } else {
    add(
      'wa_token',
      'WhatsApp Cloud API — credenciais',
      'ok',
      'Token e Phone Number ID configurados.',
      '',
    )
  }

  // -------------------------------------------------- verificação do número
  if (waToken && waPhoneId) {
    try {
      var phoneRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          waPhoneId +
          '?fields=display_phone_number,verified_name,quality_rating,status,name_status',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + waToken },
        timeout: 15,
      })
      if (phoneRes && phoneRes.statusCode === 200 && phoneRes.json) {
        var pj = phoneRes.json
        var q = String(pj.quality_rating || '')
        var st = String(pj.status || '')
        var qStatus = q === 'GREEN' || q === '' ? 'ok' : q === 'YELLOW' ? 'warn' : 'fail'
        add(
          'wa_number',
          'Número oficial no WhatsApp',
          qStatus,
          'Número ' +
            (pj.display_phone_number || '?') +
            ' (' +
            (pj.verified_name || 'sem nome verificado') +
            '). Qualidade: ' +
            (q || 'não informada') +
            '. Status: ' +
            (st || '?') +
            '.',
          qStatus === 'ok'
            ? ''
            : 'Qualidade ' + q + ': reduzir volume e revisar a régua antes de escalar o anúncio.',
        )
      } else {
        var perr = (phoneRes && phoneRes.json && phoneRes.json.error) || {}
        add(
          'wa_number',
          'Número oficial no WhatsApp',
          'fail',
          'A Meta recusou a consulta ao número (HTTP ' +
            (phoneRes ? phoneRes.statusCode : '?') +
            '): ' +
            String(perr.message || 'sem detalhe'),
          'Token inválido/expirado ou Phone Number ID errado.',
        )
      }
    } catch (errP) {
      add(
        'wa_number',
        'Número oficial no WhatsApp',
        'fail',
        'Falha de rede ao consultar a Meta: ' + String(errP),
        'Verificar conexão do projeto.',
      )
    }
  }

  // --------------------------------------------------------- appsecret_proof
  var appSecret = ''
  try {
    appSecret =
      (user.getString('meta_app_secret') || '').trim() ||
      (user.getString('meta_instagram_app_secret') || '').trim()
  } catch (_) {}
  if (!appSecret) {
    try {
      appSecret = String($os.getenv('META_APP_SECRET') || '').trim()
    } catch (_) {}
  }
  add(
    'appsecret',
    'App Secret (appsecret_proof)',
    appSecret ? 'ok' : 'warn',
    appSecret
      ? 'Configurado: as chamadas de envio vão assinadas.'
      : 'Não configurado. Se "Require App Secret" estiver ativo no app Meta, os envios são rejeitados.',
    appSecret ? '' : 'Preencher meta_app_secret nas configurações.',
  )

  // ------------------------------------------------------------- verify token
  var verifyToken = ''
  try {
    verifyToken = (user.getString('meta_whatsapp_verify_token') || '').trim()
  } catch (_) {}
  add(
    'verify_token',
    'Verify Token do webhook',
    verifyToken ? 'ok' : 'fail',
    verifyToken
      ? 'Configurado. O handshake do webhook responde com o challenge.'
      : 'Ausente: a Meta não consegue validar a URL do webhook.',
    verifyToken ? '' : 'Definir um verify token e colar o mesmo no painel da Meta.',
  )

  // ---------------------------------------- template de abertura (janela 24h)
  var leadTpl = ''
  try {
    leadTpl = (user.getString('meta_whatsapp_lead_template') || '').trim()
  } catch (_) {}
  var approvedTemplates = []
  try {
    approvedTemplates = $app.findRecordsByFilter(
      'whatsapp_templates',
      "status = 'APPROVED'",
      '-created',
      50,
      0,
    )
  } catch (_) {}

  if (leadTpl) {
    add(
      'lead_template',
      'Template de abertura (fora da janela 24h)',
      'ok',
      'Template configurado: ' + leadTpl + '.',
      '',
    )
  } else if (approvedTemplates && approvedTemplates.length > 0) {
    add(
      'lead_template',
      'Template de abertura (fora da janela 24h)',
      'warn',
      approvedTemplates.length +
        ' template(s) aprovado(s) na base; será usado o mais recente por padrão (' +
        (approvedTemplates[0].getString('name') || '?') +
        ').',
      'Fixar o template certo em meta_whatsapp_lead_template para não depender do mais recente.',
    )
  } else {
    add(
      'lead_template',
      'Template de abertura (fora da janela 24h)',
      'fail',
      'Nenhum template aprovado. Um lead de formulário de anúncio NUNCA escreveu no WhatsApp, então está fora da janela de 24h: a Meta rejeita texto livre (erro 131047) e o lead não recebe a primeira mensagem.',
      'Criar e submeter um template de abertura (UTILITY) na aba de templates e aguardar aprovação ANTES de ligar o anúncio.',
    )
  }

  // -------------------------------------------------------------------- CAPI
  var datasetId = ''
  var capiToken = ''
  try {
    datasetId = (user.getString('meta_dataset_id') || user.getString('meta_pixel_id') || '').trim()
    capiToken = (user.getString('meta_capi_token') || '').trim()
  } catch (_) {}
  if (!datasetId || !capiToken) {
    add(
      'capi',
      'Conversions API (CAPI)',
      'warn',
      'Pixel/Dataset ou token do CAPI não configurado. O CRM funciona, mas a Meta não recebe os eventos de conversão.',
      'Configurar Dataset ID e token do CAPI para o anúncio otimizar por lead real.',
    )
  } else {
    add('capi', 'Conversions API (CAPI)', 'ok', 'Dataset e token configurados.', '')
  }

  // --------------------------------------------------------------- régua/app
  var reguaActive = false
  try {
    var rc = $app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
    reguaActive = rc.getBool('is_active')
  } catch (_) {}
  add(
    'regua',
    'Régua de retomada',
    reguaActive ? 'warn' : 'ok',
    reguaActive
      ? 'LIGADA. Ela dispara em lotes de 15 contatos a cada 15 minutos — foi o que gerou centenas de mensagens iguais no ciclo de 26/11.'
      : 'Desligada: nenhum disparo automático em massa neste momento.',
    reguaActive
      ? 'Antes de escalar o anúncio, revisar o volume (teto por contato) para não derrubar a qualidade do número.'
      : '',
  )

  // ------------------------------------------------------- cérebro da Bia v7
  var constitution = null
  try {
    var ls = $app.findRecordsByFilter('bia_learnings', 'is_active = true', '-priority', 1, 0)
    if (ls && ls.length > 0) constitution = ls[0]
  } catch (_) {}
  if (!constitution) {
    add(
      'constitution',
      'Constituição ativa da Bia',
      'fail',
      'Nenhuma diretriz ativa.',
      'Ativar a CONSTITUIÇÃO BIA v7.',
    )
  } else {
    var cPriority = constitution.getInt('priority')
    var cTitle = constitution.getString('title') || ''
    var isV7 = cTitle.toLowerCase().indexOf('v7') !== -1
    add(
      'constitution',
      'Constituição ativa da Bia',
      isV7 && cPriority >= 2500 ? 'ok' : 'warn',
      cTitle + ' (prioridade ' + cPriority + ').',
      isV7 && cPriority >= 2500
        ? ''
        : 'Confirmar que a v7 é a diretriz que deve reger o atendimento.',
    )

    var ruleText = constitution.getString('rule_text') || ''
    var hasNoPhone = /nunca\s+escreva.*telefone|regra\s+proibitiva/i.test(ruleText)
    add(
      'constitution_phone',
      'Regra de nenhum telefone',
      hasNoPhone ? 'ok' : 'warn',
      hasNoPhone
        ? 'A constituição proíbe telefone — coerente com a suíte de testes.'
        : 'A constituição não deixa explícita a proibição de telefone.',
      hasNoPhone ? '' : 'Revisar a seção de transbordo da constituição.',
    )
  }

  // ----------------------------------------------------- lições automáticas
  var autoByTitle = {}
  var duplicated = 0
  try {
    var allActive = $app.findRecordsByFilter(
      'bia_learnings',
      'is_active = true',
      '-created',
      100,
      0,
    )
    for (var i = 0; i < (allActive ? allActive.length : 0); i++) {
      var r = allActive[i]
      var origin = (r.getString('origin') || '').toLowerCase()
      var author = (r.getString('author') || '').toLowerCase()
      var isAuto =
        origin === 'cron_semanal' ||
        origin === 'loop_semanal' ||
        author.indexOf('loop semanal') !== -1
      if (!isAuto) continue
      var t = (r.getString('title') || '').trim().toLowerCase()
      if (autoByTitle[t]) duplicated++
      else autoByTitle[t] = true
    }
  } catch (_) {}
  add(
    'lessons_dup',
    'Lições automáticas duplicadas',
    duplicated === 0 ? 'ok' : 'warn',
    duplicated === 0
      ? 'Nenhuma cópia duplicada consumindo o orçamento das lições vivas.'
      : duplicated +
          ' cópia(s) duplicada(s) ativa(s). O motor já ignora no prompt, mas o registro continua no banco.',
    duplicated === 0 ? '' : 'Rodar POST /backend/v1/bia/consolidate_weekly_regua para limpar.',
  )

  // ------------------------------------------------------------ base/dossiê
  var kbCount = 0
  try {
    var kbs = $app.findRecordsByFilter(
      'ai_knowledge_files',
      'is_active != false',
      '-created',
      500,
      0,
    )
    kbCount = kbs ? kbs.length : 0
  } catch (_) {}
  add(
    'knowledge',
    'Base de conhecimento',
    kbCount > 0 ? 'ok' : 'fail',
    kbCount + ' documento(s) ativo(s) na base.',
    kbCount > 0 ? '' : 'Enviar as tabelas e dossiês dos lançamentos.',
  )

  var propCount = 0
  try {
    var ps = $app.findRecordsByFilter('properties', 'is_active = true', '-created', 500, 0)
    propCount = ps ? ps.length : 0
  } catch (_) {}
  add(
    'catalog',
    'Catálogo de imóveis',
    propCount > 0 ? 'ok' : 'fail',
    propCount + ' imóvel(is) ativo(s) no catálogo.',
    propCount > 0 ? '' : 'Sincronizar o estoque do site/CRM.',
  )

  // ------------------------------------------------------------- resultado
  var fails = 0
  var warns = 0
  for (var c = 0; c < checks.length; c++) {
    if (checks[c].status === 'fail') fails++
    else if (checks[c].status === 'warn') warns++
  }

  return e.json(200, {
    ok: fails === 0,
    pronto_para_anuncio: fails === 0 && warns === 0,
    resumo: {
      total: checks.length,
      ok: checks.length - fails - warns,
      atencao: warns,
      bloqueios: fails,
    },
    duracao_ms: Date.now() - startedAt,
    checks: checks,
  })
}

routerAdd('GET', '/backend/v1/bia/meta_readiness', handleMetaReadiness)
routerAdd('POST', '/backend/v1/bia/meta_readiness', handleMetaReadiness)

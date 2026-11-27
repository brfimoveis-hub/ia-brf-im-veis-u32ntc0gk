// ============================================================================
// TEMPLATE DE ABERTURA DO LEAD — BRF IMÓVEIS / BIA
// Rota: GET/POST /backend/v1/bia/lead_template_setup
//
// Por que existe:
// A API oficial do WhatsApp só aceita TEXTO LIVRE dentro de 24h contadas da
// última mensagem do CLIENTE. Um lead de formulário de anúncio nunca escreveu no
// WhatsApp: a primeira mensagem PRECISA ser um template aprovado, senão a Meta
// rejeita (erro 131047) e o lead se perde sem registro.
//
// O que faz:
//  1. Descobre o WABA ID (campo do usuário -> debug_token -> constante conhecida).
//  2. Sincroniza o status do template local com a Meta.
//  3. Se não existir, cria e submete o template de abertura à Meta.
//  4. Só fixa em users.project_data.lead_template quando estiver APPROVED —
//     fixar um template PENDING faria o envio falhar.
// ============================================================================

function handleLeadTemplateSetup(e) {
  var out = { passos: [], ok: false }

  function step(nome, status, detalhe) {
    out.passos.push({ passo: nome, status: status, detalhe: detalhe || '' })
  }

  // ---------------------------------------------------------------- usuário
  var user = null
  try {
    var users = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
    if (users && users.length > 0) user = users[0]
  } catch (_) {}
  if (!user) {
    step('usuario', 'fail', 'Nenhum usuário encontrado.')
    return e.json(200, out)
  }

  var token = ''
  var wabaId = ''
  try {
    token = (user.getString('meta_whatsapp_access_token') || '').trim()
    wabaId = (user.getString('meta_whatsapp_business_id') || '').trim()
  } catch (_) {}

  if (!token) {
    step('credenciais', 'fail', 'Token do WhatsApp ausente.')
    return e.json(200, out)
  }
  step('credenciais', 'ok', 'Token presente.')

  // ------------------------------------------------------------- appsecret
  var secret = ''
  try {
    secret =
      (user.getString('meta_app_secret') || '').trim() ||
      (user.getString('meta_instagram_app_secret') || '').trim()
  } catch (_) {}
  if (!secret) {
    try {
      secret = String($os.getenv('META_APP_SECRET') || '').trim()
    } catch (_) {}
  }
  function proof(joiner) {
    if (!secret) return ''
    try {
      return joiner + 'appsecret_proof=' + $security.hs256(String(token), secret)
    } catch (_) {
      return ''
    }
  }

  // ------------------------------------------------------ descobrir o WABA
  if (!wabaId) {
    try {
      var dbg = $http.send({
        url:
          'https://graph.facebook.com/v21.0/debug_token?input_token=' +
          encodeURIComponent(token) +
          proof('&'),
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })
      if (dbg && dbg.statusCode === 200 && dbg.json && dbg.json.data) {
        var scopes = dbg.json.data.granular_scopes || []
        for (var s = 0; s < scopes.length; s++) {
          var ids = (scopes[s] && scopes[s].target_ids) || []
          if (scopes[s].scope && String(scopes[s].scope).indexOf('whatsapp_business') !== -1) {
            if (ids.length > 0) {
              wabaId = String(ids[0])
              break
            }
          }
        }
      }
    } catch (_) {}
  }
  if (!wabaId) wabaId = '3542548689255402'
  step('waba', wabaId ? 'ok' : 'fail', 'WABA ID usado: ' + wabaId)

  // -------------------------------------------------- nome do template
  var TPL_NAME = 'brf_abertura_lead'
  var TPL_LANG = 'pt_BR'

  // Texto genérico: serve para qualquer lançamento ou imóvel de terceiros que o
  // anúncio esteja divulgando. Uma variável: o primeiro nome do lead.
  var TPL_BODY =
    'Olá, {{1}}! Aqui é a Bia, da BRF Imóveis. Recebi seu contato sobre um dos nossos imóveis em Florianópolis e região. ' +
    'Posso te passar valores, plantas e condições de pagamento. Como posso te ajudar?'

  function syncLocal() {
    var local = null
    try {
      var recs = $app.findRecordsByFilter(
        'whatsapp_templates',
        "name = '" + TPL_NAME + "'",
        '-created',
        1,
        0,
      )
      if (recs && recs.length > 0) local = recs[0]
    } catch (_) {}
    return local
  }

  function fetchMetaStatus(targetName) {
    try {
      var res = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          wabaId +
          '/message_templates?name=' +
          encodeURIComponent(targetName) +
          proof('&'),
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 20,
      })
      if (res && res.statusCode === 200 && res.json && res.json.data) {
        for (var i = 0; i < res.json.data.length; i++) {
          var t = res.json.data[i]
          if (t && t.name === targetName) return t
        }
      }
    } catch (_) {}
    return null
  }

  // ------------------------------------------------------- criar se faltar
  var metaTpl = fetchMetaStatus(TPL_NAME)
  var createdNow = false

  if (!metaTpl) {
    var payload = {
      name: TPL_NAME,
      category: 'MARKETING',
      language: TPL_LANG,
      components: [
        {
          type: 'BODY',
          text: TPL_BODY,
          example: { body_text: [['Mauro']] },
        },
      ],
    }
    try {
      var createRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + wabaId + '/message_templates',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
        timeout: 30,
      })
      if (createRes && createRes.statusCode >= 200 && createRes.statusCode < 300) {
        createdNow = true
        step('criar template', 'ok', 'Template submetido à Meta para análise.')
      } else {
        var errObj = (createRes && createRes.json && createRes.json.error) || {}
        step(
          'criar template',
          'fail',
          'A Meta recusou (HTTP ' +
            (createRes ? createRes.statusCode : '?') +
            '): ' +
            String(errObj.message || 'sem detalhe'),
        )
      }
    } catch (errC) {
      step('criar template', 'fail', 'Falha de rede: ' + String(errC))
    }
    metaTpl = fetchMetaStatus(TPL_NAME)
  } else {
    step('criar template', 'ok', 'Template já existia na Meta.')
  }

  var metaStatus = metaTpl ? String(metaTpl.status || '').toUpperCase() : ''
  step(
    'status na Meta',
    metaStatus === 'APPROVED' ? 'ok' : 'warn',
    metaStatus
      ? 'Status atual: ' + metaStatus
      : 'Ainda não aparece na consulta (a propagação pode levar alguns segundos).',
  )

  // --------------------------------------------- salvar registro local
  try {
    var col = $app.findCollectionByNameOrId('whatsapp_templates')
    var rec = syncLocal()
    if (!rec) {
      rec = new Record(col)
      rec.set('user_id', user.id)
      rec.set('name', TPL_NAME)
    }
    rec.set('category', 'MARKETING')
    rec.set('language', TPL_LANG)
    rec.set('body_text', TPL_BODY)
    rec.set('status', metaStatus || 'PENDING')
    if (metaTpl && metaTpl.id) rec.set('meta_template_id', metaTpl.id)
    rec.set('example_values', ['Mauro'])
    $app.save(rec)
    step('registro local', 'ok', 'Template registrado no CRM.')
  } catch (errS) {
    step('registro local', 'warn', 'Não foi possível salvar o registro: ' + String(errS))
  }

  // --------------------------- fixar em project_data SÓ se aprovado
  var fixed = false
  try {
    var pd = user.get('project_data') || {}
    if (typeof pd !== 'object' || pd === null) pd = {}
    if (metaStatus === 'APPROVED') {
      pd.lead_template = TPL_NAME
      pd.lead_template_lang = TPL_LANG
      user.set('project_data', pd)
      $app.save(user)
      fixed = true
      step('fixar template', 'ok', 'Template fixado como abertura oficial.')
    } else {
      step(
        'fixar template',
        'warn',
        'Não fixado ainda: passa a valer quando a Meta aprovar (status atual: ' +
          (metaStatus || 'PENDING') +
          ').',
      )
    }
  } catch (errF) {
    step('fixar template', 'fail', 'Erro ao fixar: ' + String(errF))
  }

  out.ok = true
  out.template = {
    name: TPL_NAME,
    language: TPL_LANG,
    category: 'MARKETING',
    body: TPL_BODY,
    status: metaStatus || 'PENDING',
    fixado: fixed,
    criado_agora: createdNow,
  }
  return e.json(200, out)
}

routerAdd('GET', '/backend/v1/bia/lead_template_setup', handleLeadTemplateSetup)
routerAdd('POST', '/backend/v1/bia/lead_template_setup', handleLeadTemplateSetup)

// Endpoint SOMENTE-LEITURA: GET /backend/v1/whatsapp_quality_report?key=brf-diag-2026
// Diagnóstico da pontuação de qualidade do número WhatsApp do projeto
// (55 48 99209-8050, phone_number_id 1239571259250639, WABA 3542548689255402).
//
// NÃO altera nenhum dado, NÃO envia mensagem, NÃO muda a régua.
// Lê: users.meta_whatsapp_access_token (mesma fonte do system_health_watch e
// cron_bia_persistence) + users.meta_app_secret para o appsecret_proof.
//
// Graph API (v21.0, sempre com appsecret_proof — exigência do app com
// "Require App Secret" ativo, rito v0.0.1425):
//   1. GET /{phone_number_id}?fields=quality_rating  (1 campo por chamada:
//      um campo inexistente na versão da Graph não derruba os outros)
//   2. GET /{waba_id}/analytics?start=...&end=...&granularity=DAY  (14 dias)
//   3. GET /{waba_id}?fields=conversation_analytics.start(...)...  (conversas)
//   4. GET /{waba_id}?fields=phone_numbers{id,display_phone_number,quality_rating}
//
// NOTA DE ESCOPO: toda a lógica vive DENTRO do callback da rota — declarações
// de topo não são visíveis dentro de callbacks no JSVM do PocketBase
// (mesma lição da v0.0.1422 'appCreds not defined').

routerAdd(
  'GET',
  '/backend/v1/whatsapp_quality_report',
  (e) => {
    var DIAG_KEY = String($os.getenv('WA_QUALITY_DIAG_KEY') || 'brf-diag-2026')
    var reqKey = e.requestInfo().query.key || ''
    if (reqKey !== DIAG_KEY) {
      return e.unauthorizedError('chave de diagnóstico inválida')
    }

    var app = $app
    var GRAPH_V = 'v21.0'
    var result = {
      generated_at: new Date().toISOString(),
      graph_version: GRAPH_V,
      phone_number_id: '',
      waba_id: '',
      quality_rating: null,
      account_mode: null,
      display_phone_number: '',
      analytics_14d: null,
      conversation_analytics_14d: null,
      phone_numbers_on_waba: null,
      waba_base: null,
      errors: [],
    }

    // ---------- 1. Credenciais (mesma fonte do system_health_watch) ----------
    var token = ''
    var phoneId = ''
    var wabaId = ''
    var proofSecret = ''
    try {
      var users = app.findRecordsByFilter(
        'users',
        "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
        '-updated',
        1,
        0,
      )
      if (users && users.length > 0) {
        var u = users[0]
        token = u.getString('meta_whatsapp_access_token') || ''
        phoneId = u.getString('meta_whatsapp_phone_number_id') || ''
        wabaId = u.getString('meta_whatsapp_business_id') || ''
        proofSecret = (u.getString('meta_app_secret') || '').trim()
        if (!proofSecret) proofSecret = (u.getString('meta_instagram_app_secret') || '').trim()
      }
    } catch (dbErr) {
      result.errors.push('DB: ' + dbErr.message)
    }
    if (!token)
      token = String($os.getenv('WHATSAPP_TOKEN') || $os.getenv('META_WHATSAPP_ACCESS_TOKEN') || '')
    if (!phoneId)
      phoneId = String(
        $os.getenv('WHATSAPP_PHONE_ID') || $os.getenv('META_WHATSAPP_PHONE_NUMBER_ID') || '',
      )
    if (!proofSecret) proofSecret = String($os.getenv('META_APP_SECRET') || '').trim()

    if (!token || !phoneId) {
      console.error(
        '[WA_QUALITY_REPORT] Credenciais ausentes (token=' +
          !!token +
          ', phoneId=' +
          !!phoneId +
          ')',
      )
      result.errors.push('CREDENCIAIS_META_AUSENTES')
      return e.json(200, result)
    }
    result.phone_number_id = phoneId
    result.waba_id = wabaId

    var proof = function (accessToken) {
      if (!proofSecret || !accessToken) return ''
      try {
        return '&appsecret_proof=' + $security.hs256(String(accessToken), proofSecret)
      } catch (_) {
        return ''
      }
    }
    var graphGet = function (pathWithQuery) {
      var url = 'https://graph.facebook.com/' + GRAPH_V + '/' + pathWithQuery + proof(token)
      var res = $http.send({
        url: url,
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 20,
      })
      var body = null
      try {
        body = res && res.json ? res.json : JSON.parse(res.raw || res.body || '{}')
      } catch (_) {}
      return {
        status: res ? res.statusCode : 0,
        body: body,
        raw: res ? String(res.raw || res.body || '') : '',
      }
    }

    // ---------- 2. Pontuação de qualidade do phone number ----------
    var phFields = ['quality_rating', 'account_mode', 'display_phone_number', 'capacity']
    for (var fi = 0; fi < phFields.length; fi++) {
      var fName = phFields[fi]
      try {
        var ph = graphGet(phoneId + '?fields=' + fName)
        console.log(
          '[WA_QUALITY_REPORT] phone GET ' +
            fName +
            ' status=' +
            ph.status +
            ' body=' +
            ph.raw.substring(0, 300),
        )
        if (ph.status >= 200 && ph.status < 300 && ph.body && fName in ph.body) {
          if (fName === 'quality_rating')
            result.quality_rating = ph.body.quality_rating || 'UNKNOWN'
          else if (fName === 'account_mode') result.account_mode = ph.body.account_mode
          else if (fName === 'capacity') result.capacity = ph.body.capacity
          else result.display_phone_number = ph.body.display_phone_number || ''
        } else if (ph.status >= 400) {
          result.errors.push(
            'phone.' + fName + ' HTTP ' + ph.status + ': ' + ph.raw.substring(0, 200),
          )
        }
      } catch (errPh) {
        result.errors.push('phone.' + fName + ' EXC: ' + errPh.message)
        console.error('[WA_QUALITY_REPORT] phone.' + fName + ' EXC: ' + errPh.message)
      }
    }

    // ---------- 3/4/5. Analytics, conversas e phone_numbers (nó da WABA) ----------
    if (wabaId) {
      var nowSec = Math.floor(Date.now() / 1000)
      var startSec = nowSec - 14 * 24 * 3600
      try {
        var an = graphGet(
          wabaId +
            '/analytics?start=' +
            startSec +
            '&end=' +
            nowSec +
            '&granularity=DAY&phone_numbers=' +
            phoneId,
        )
        console.log(
          '[WA_QUALITY_REPORT] analytics GET status=' +
            an.status +
            ' body=' +
            an.raw.substring(0, 600),
        )
        if (an.status >= 200 && an.status < 300 && an.body) {
          result.analytics_14d = an.body.analytics || an.body
        } else {
          result.errors.push('analytics GET HTTP ' + an.status + ': ' + an.raw.substring(0, 300))
        }
      } catch (errAn) {
        result.errors.push('analytics EXC: ' + errAn.message)
        console.error('[WA_QUALITY_REPORT] analytics EXC: ' + errAn.message)
      }
      try {
        var convFields =
          'conversation_analytics.start(' +
          startSec +
          ').end(' +
          nowSec +
          ')' +
          '.granularity(DAY).dimensions(CONVERSATION_DIRECTION,CONVERSATION_CATEGORY,PHONE)'
        var cv = graphGet(wabaId + '?fields=' + encodeURIComponent(convFields))
        console.log(
          '[WA_QUALITY_REPORT] conversation_analytics GET status=' +
            cv.status +
            ' body=' +
            cv.raw.substring(0, 800),
        )
        if (cv.status >= 200 && cv.status < 300 && cv.body) {
          result.conversation_analytics_14d = cv.body.conversation_analytics || null
        } else {
          result.errors.push(
            'conversation_analytics GET HTTP ' + cv.status + ': ' + cv.raw.substring(0, 300),
          )
        }
      } catch (errCv) {
        result.errors.push('conversation_analytics EXC: ' + errCv.message)
        console.error('[WA_QUALITY_REPORT] conversation_analytics EXC: ' + errCv.message)
      }
      try {
        var pn = graphGet(
          wabaId +
            '?fields=' +
            encodeURIComponent('phone_numbers{id,display_phone_number,quality_rating}'),
        )
        console.log(
          '[WA_QUALITY_REPORT] phone_numbers GET status=' +
            pn.status +
            ' body=' +
            pn.raw.substring(0, 500),
        )
        if (pn.status >= 200 && pn.status < 300 && pn.body) {
          result.phone_numbers_on_waba = pn.body.phone_numbers || null
        } else {
          result.errors.push(
            'phone_numbers GET HTTP ' + pn.status + ': ' + pn.raw.substring(0, 300),
          )
        }
      } catch (errPn) {
        result.errors.push('phone_numbers EXC: ' + errPn.message)
        console.error('[WA_QUALITY_REPORT] phone_numbers EXC: ' + errPn.message)
      }
      try {
        var wb = graphGet(
          wabaId +
            '?fields=' +
            encodeURIComponent('id,name,account_review_status,business_verification_status'),
        )
        console.log(
          '[WA_QUALITY_REPORT] waba base GET status=' +
            wb.status +
            ' body=' +
            wb.raw.substring(0, 300),
        )
        if (wb.status >= 200 && wb.status < 300 && wb.body) {
          result.waba_base = wb.body
        } else {
          result.errors.push('waba base HTTP ' + wb.status + ': ' + wb.raw.substring(0, 200))
        }
      } catch (errWb) {
        result.errors.push('waba base EXC: ' + errWb.message)
      }
    } else {
      result.errors.push('WABA_ID ausente nos users — analytics e conversas não consultados')
    }

    // ---------- 6. Resumo legível nos logs ----------
    var rating = result.quality_rating || 'DESCONHECIDO'
    var sent = 0,
      delivered = 0,
      read = 0
    if (result.analytics_14d && result.analytics_14d.data && result.analytics_14d.data[0]) {
      var d0 = result.analytics_14d.data[0]
      sent = d0.sent || 0
      delivered = d0.delivered || 0
      read = d0.read || 0
    }
    console.log(
      '[WA_QUALITY_REPORT] RESUMO: quality_rating=' +
        rating +
        ' | 14d enviadas=' +
        sent +
        ' entregues=' +
        delivered +
        ' lidas=' +
        read +
        ' | erros=' +
        result.errors.length,
    )
    console.log('[WA_QUALITY_REPORT] FULL=' + JSON.stringify(result).substring(0, 2500))
    return e.json(200, result)
  },
  /* public */ true,
)

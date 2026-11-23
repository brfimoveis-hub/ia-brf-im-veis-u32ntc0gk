// AUTO-DISPARO ÚNICO (auto-expira), SOMENTE-LEITURA:
// roda o diagnóstico de qualidade WhatsApp 1x na primeira execução do cron
// após o deploy e o cron se remove sozinho. Não grava, não envia nada.
//
// A rota equivalente (mesma lógica, mesma saída nos logs) é
// pocketbase/hooks/whatsapp_quality_report.js —
// GET /backend/v1/whatsapp_quality_report?key=brf-diag-2026
//
// Duplica a lógica porque a JSVM do PocketBase não compartilha declarações de
// nível superior entre callbacks (regra de escopo v0.0.1422): cada callback
// precisa ser autocontido.

try {
  cronAdd('wa_quality_diag_once', '*/5 * * * *', function () {
    try {
      cronRemove('wa_quality_diag_once')
    } catch (_) {}
    try {
      console.log('[WA_QUALITY_REPORT] AUTO-DISPARO (cron 1x) iniciado')
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
        token = String(
          $os.getenv('WHATSAPP_TOKEN') || $os.getenv('META_WHATSAPP_ACCESS_TOKEN') || '',
        )
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
      } else {
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
        var graphGet = function (path, fieldsQuery) {
          var url =
            'https://graph.facebook.com/' +
            GRAPH_V +
            '/' +
            path +
            '?fields=' +
            fieldsQuery +
            proof(token)
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

        // Qualidade do phone number (um campo por chamada)
        var phFields = ['quality_rating', 'account_mode', 'display_phone_number']
        for (var fi = 0; fi < phFields.length; fi++) {
          var fName = phFields[fi]
          try {
            var ph = graphGet(phoneId, fName)
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

        if (wabaId) {
          var nowSec = Math.floor(Date.now() / 1000)
          var startSec = nowSec - 14 * 24 * 3600

          // Analytics últimos 14 dias (nó da WABA)
          try {
            var anUrl =
              'https://graph.facebook.com/' +
              GRAPH_V +
              '/' +
              wabaId +
              '/analytics?start=' +
              startSec +
              '&end=' +
              nowSec +
              '&granularity=DAY&phone_numbers=' +
              phoneId +
              proof(token)
            var anRes = $http.send({
              url: anUrl,
              method: 'GET',
              headers: { Authorization: 'Bearer ' + token },
              timeout: 20,
            })
            var anBody = null
            try {
              anBody = anRes && anRes.json ? anRes.json : JSON.parse(anRes.raw || '{}')
            } catch (_) {}
            var anRaw = anRes ? String(anRes.raw || anRes.body || '') : ''
            console.log(
              '[WA_QUALITY_REPORT] analytics GET status=' +
                (anRes ? anRes.statusCode : 0) +
                ' body=' +
                anRaw.substring(0, 600),
            )
            if (anRes && anRes.statusCode >= 200 && anRes.statusCode < 300 && anBody) {
              result.analytics_14d = anBody.analytics || anBody
            } else {
              result.errors.push(
                'analytics GET HTTP ' +
                  (anRes ? anRes.statusCode : 0) +
                  ': ' +
                  anRaw.substring(0, 300),
              )
            }
          } catch (errAn) {
            result.errors.push('analytics EXC: ' + errAn.message)
            console.error('[WA_QUALITY_REPORT] analytics EXC: ' + errAn.message)
          }

          // Conversas por categoria
          try {
            var convFields =
              'conversation_analytics.start(' +
              startSec +
              ').end(' +
              nowSec +
              ')' +
              '.granularity(DAY).dimensions(CONVERSATION_DIRECTION,CONVERSATION_CATEGORY,PHONE)'
            var cv = graphGet(wabaId, convFields)
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

          // Phone numbers na WABA
          try {
            var pn = graphGet(wabaId, 'phone_numbers{id,display_phone_number,quality_rating}')
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

          // Leitura base da WABA (contexto)
          try {
            var wabaBase = graphGet(
              wabaId,
              'id,name,account_review_status,business_verification_status',
            )
            console.log(
              '[WA_QUALITY_REPORT] waba base GET status=' +
                wabaBase.status +
                ' body=' +
                wabaBase.raw.substring(0, 300),
            )
            if (wabaBase.status >= 200 && wabaBase.status < 300 && wabaBase.body) {
              result.waba_base = wabaBase.body
            } else {
              result.errors.push(
                'waba base HTTP ' + wabaBase.status + ': ' + wabaBase.raw.substring(0, 200),
              )
            }
          } catch (errWb) {
            result.errors.push('waba base EXC: ' + errWb.message)
          }
        } else {
          result.errors.push('WABA_ID ausente nos users — analytics e conversas não consultados')
        }
      }

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
      console.log('[WA_QUALITY_REPORT] AUTO-DISPARO (cron 1x) concluído')
    } catch (errCron) {
      console.error('[WA_QUALITY_REPORT] AUTO-DISPARO EXC: ' + errCron.message)
    }
  })
} catch (errCronReg) {
  console.error('[WA_QUALITY_REPORT] Falha ao registrar cron 1x: ' + errCronReg.message)
}

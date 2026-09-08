// Migration 0158: Diagnóstico somente leitura das WABAs oficial e duplicada
migrate(
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {
        return
      }
    }

    const token = user.getString('meta_whatsapp_access_token')
    if (!token) return

    const logsCol = app.findCollectionByNameOrId('system_logs')

    // Helper para consulta GET à Graph API
    function getGraph(path) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + path,
          method: 'GET',
          headers: { Authorization: 'Bearer ' + token },
          timeout: 15,
        })
        return {
          statusCode: res.statusCode,
          json: res.json,
          raw: res.raw,
        }
      } catch (err) {
        return { error: err.message || String(err) }
      }
    }

    // 1. WABA oficial (1727871165105009)
    const officialWabaId = '1727871165105009'
    const officialRes = getGraph(
      officialWabaId +
        '/phone_numbers?fields=id,display_phone_number,code_verification_status,status,quality_rating,account_mode,verified_name,platform_type,host_platform',
    )

    // 2. WABA duplicada (3542548689255402)
    const duplicateWabaId = '3542548689255402'
    const duplicateRes = getGraph(
      duplicateWabaId +
        '/phone_numbers?fields=id,display_phone_number,code_verification_status,status,quality_rating,account_mode,verified_name,platform_type,host_platform',
    )

    // 3. Info da própria WABA duplicada
    const duplicateWabaInfo = getGraph(
      duplicateWabaId + '?fields=id,name,timezone_id,account_review_status',
    )

    // 4. Grava os resultados em system_logs
    const log = new Record(logsCol)
    log.set('type', 'waba_phone_numbers_diagnostic')
    log.set(
      'message',
      'WABA 1727871165105009 status=' +
        officialRes.statusCode +
        ' | WABA 3542548689255402 status=' +
        duplicateRes.statusCode,
    )
    log.set('user_id', user.id)
    log.set(
      'details',
      JSON.stringify({
        official_waba: {
          id: officialWabaId,
          result: officialRes,
        },
        duplicate_waba: {
          id: duplicateWabaId,
          result: duplicateRes,
          info: duplicateWabaInfo,
        },
      }),
    )
    app.save(log)
  },
  (app) => {},
)

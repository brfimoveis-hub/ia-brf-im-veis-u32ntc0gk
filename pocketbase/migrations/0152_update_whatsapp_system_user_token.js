// Migration 0152: Salva o novo token de Usuário do Sistema "BIA CRM" para o usuário Mauro Fengler,
// valida o token contra a Meta Graph API (/debug_token), consulta os dados do telefone 1324150594116725,
// verifica e garante a inscrição do app 2442476629610638 na WABA 1727871165105009,
// atualiza o status no CRM e grava log completo de diagnóstico em system_logs.

migrate(
  (app) => {
    const targetUserId = 'g5jto8bhulw01bz'
    let user = null
    try {
      user = app.findRecordById('users', targetUserId)
    } catch (_) {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (err) {
        console.log('[MIG_0152] Usuário não encontrado')
        return
      }
    }

    const newToken =
      'EAAita2fhUI4BSZAxLo4UO9S32UNksNe3sPPwLd93V20tC0j5xsCCLXadHA9jofrvYCzmm09ca2xADa9Imd2mh3OmlAucrFkZAfYQvx0Ov0povU7cYaTFfiQHD3Y9ASRVHdlysm62J9W8lNMbujGZB3MtKZBTZA3xOR4aJ0ZCIvsCNfAK7ZCbEMg3ZAZB2nxPYUQZDZD'

    // 1. Atualizar o meta_whatsapp_access_token preservando intactos os demais campos
    user.set('meta_whatsapp_access_token', newToken)
    app.saveNoValidate(user)

    const wabaId = user.getString('meta_whatsapp_business_id') || '1727871165105009'
    const phoneId = user.getString('meta_whatsapp_phone_number_id') || '1324150594116725'
    const appId = user.getString('meta_app_id') || '2442476629610638'
    const appSecret = user.getString('meta_app_secret') || 'd085b85d8d534c682f60b6bde8043610'
    const appAccessToken = appId + '|' + appSecret

    console.log('[MIG_0152] Token salvo com sucesso. Iniciando verificações na Meta API...')

    // 2. Validar token contra Meta Graph API (/debug_token)
    let debugTokenResult = null
    try {
      const debugRes = $http.send({
        url:
          'https://graph.facebook.com/debug_token?input_token=' +
          encodeURIComponent(newToken) +
          '&access_token=' +
          encodeURIComponent(appAccessToken),
        method: 'GET',
        timeout: 15,
      })
      debugTokenResult = {
        statusCode: debugRes.statusCode,
        body: debugRes.json,
      }
      console.log(
        '[MIG_0152] /debug_token status=' +
          debugRes.statusCode +
          ' body=' +
          JSON.stringify(debugRes.json),
      )
    } catch (dErr) {
      console.log('[MIG_0152] Erro ao chamar debug_token: ' + (dErr.message || dErr))
      debugTokenResult = { error: dErr.message || String(dErr) }
    }

    // 3. Consultar GET /v21.0/1324150594116725
    let phoneResult = null
    try {
      const phoneFields =
        'id,display_phone_number,verified_name,code_verification_status,status,quality_rating,account_mode'
      const phoneRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneId + '?fields=' + phoneFields,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + newToken,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })
      phoneResult = {
        statusCode: phoneRes.statusCode,
        body: phoneRes.json,
      }
      console.log(
        '[MIG_0152] GET phone info status=' +
          phoneRes.statusCode +
          ' body=' +
          JSON.stringify(phoneRes.json),
      )
    } catch (pErr) {
      console.log('[MIG_0152] Erro ao consultar phone info: ' + (pErr.message || pErr))
      phoneResult = { error: pErr.message || String(pErr) }
    }

    // 4. Confirmar que o app está inscrito na WABA (GET /1727871165105009/subscribed_apps)
    // Se não estiver, reinscrever via POST /{waba-id}/subscribed_apps
    let subscribedAppsGet = null
    let subscribedAppsPost = null
    let subscribedAppsVerify = null

    try {
      const subGetRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + newToken,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })
      subscribedAppsGet = {
        statusCode: subGetRes.statusCode,
        body: subGetRes.json,
      }
      console.log(
        '[MIG_0152] GET subscribed_apps status=' +
          subGetRes.statusCode +
          ' body=' +
          JSON.stringify(subGetRes.json),
      )

      let isSubscribed = false
      if (
        subGetRes.statusCode >= 200 &&
        subGetRes.statusCode < 300 &&
        subGetRes.json &&
        Array.isArray(subGetRes.json.data)
      ) {
        isSubscribed = subGetRes.json.data.some((item) => {
          const itemAppId =
            item.id || (item.whatsapp_business_api_data && item.whatsapp_business_api_data.id)
          return String(itemAppId) === String(appId)
        })
      }

      if (!isSubscribed) {
        console.log(
          '[MIG_0152] App não inscrito ou lista vazia. Executando POST subscribed_apps...',
        )
        const subPostRes = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + newToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
          timeout: 20,
        })
        subscribedAppsPost = {
          statusCode: subPostRes.statusCode,
          body: subPostRes.json,
        }
        console.log(
          '[MIG_0152] POST subscribed_apps status=' +
            subPostRes.statusCode +
            ' body=' +
            JSON.stringify(subPostRes.json),
        )

        // Verificar novamente
        const verifyRes = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + newToken,
            'Content-Type': 'application/json',
          },
          timeout: 15,
        })
        subscribedAppsVerify = {
          statusCode: verifyRes.statusCode,
          body: verifyRes.json,
        }
      } else {
        console.log('[MIG_0152] App já está devidamente inscrito na WABA.')
      }
    } catch (sErr) {
      console.log('[MIG_0152] Erro na gestão de subscribed_apps: ' + (sErr.message || sErr))
      subscribedAppsGet = subscribedAppsGet || { error: sErr.message || String(sErr) }
    }

    // 5. Atualizar o status da conexão WhatsApp no CRM conforme o resultado real
    // Se número CONNECTED -> status conectado / meta_token_status = 'active'; se ainda PENDING -> status pendente de registro
    const phoneData = (phoneResult && phoneResult.body) || {}
    const phoneStatus = phoneData.status || ''
    const displayPhone = phoneData.display_phone_number || '+55 48 9209-8050'

    if (phoneStatus === 'CONNECTED') {
      user.set('meta_whatsapp_status', displayPhone || 'connected')
      user.set('meta_token_status', 'active')
    } else if (phoneStatus === 'PENDING') {
      // Número pendente de ativação/registro na Cloud API
      user.set('meta_whatsapp_status', displayPhone || '+55 48 9209-8050')
      user.set('meta_token_status', 'pending')
    } else if (phoneResult && phoneResult.statusCode >= 200 && phoneResult.statusCode < 300) {
      user.set('meta_whatsapp_status', displayPhone)
      user.set('meta_token_status', 'active')
    } else {
      user.set('meta_token_status', 'error')
    }
    app.saveNoValidate(user)

    // 7. Logar diagnóstico completo em system_logs
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const diagLog = new Record(logsCol)
      diagLog.set('type', 'whatsapp_token_diagnostic')
      diagLog.set(
        'message',
        'Diagnóstico do token de Usuário do Sistema "BIA CRM": phone_status=' +
          phoneStatus +
          ', code_verification=' +
          (phoneData.code_verification_status || 'N/A') +
          ', token_valid=' +
          (debugTokenResult &&
            debugTokenResult.body &&
            debugTokenResult.body.data &&
            debugTokenResult.body.data.is_valid),
      )
      diagLog.set('user_id', user.id)
      diagLog.set(
        'payload',
        JSON.stringify({
          user_id: user.id,
          token_prefix: newToken.substring(0, 10),
          token_suffix: newToken.substring(newToken.length - 6),
          app_id: appId,
          waba_id: wabaId,
          phone_number_id: phoneId,
          phone_status: phoneStatus,
          code_verification_status: phoneData.code_verification_status,
          quality_rating: phoneData.quality_rating,
          display_phone_number: phoneData.display_phone_number,
          account_mode: phoneData.account_mode,
        }),
      )
      diagLog.set(
        'details',
        JSON.stringify({
          debug_token: debugTokenResult,
          phone_info: phoneResult,
          subscribed_apps_initial: subscribedAppsGet,
          subscribed_apps_post: subscribedAppsPost,
          subscribed_apps_verify: subscribedAppsVerify,
          timestamp: new Date().toISOString(),
        }),
      )
      app.save(diagLog)
      console.log('[MIG_0152] Log gravado em system_logs com sucesso.')
    } catch (eLog) {
      console.log('[MIG_0152] Falha ao gravar log em system_logs: ' + (eLog.message || eLog))
    }
  },
  (app) => {
    // Reversão
  },
)

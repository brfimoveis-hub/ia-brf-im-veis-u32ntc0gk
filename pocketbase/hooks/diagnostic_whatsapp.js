routerAdd('POST', '/backend/v1/diagnostic_whatsapp', (e) => {
  let userRecord = null
  const authId = e.auth ? e.auth.id : ''

  if (authId) {
    try {
      userRecord = $app.findRecordById('users', authId)
    } catch (_) {}
  }

  if (!userRecord) {
    try {
      userRecord = $app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        userRecord = $app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {}
    }
  }

  if (!userRecord) {
    return e.json(200, { success: false, error: 'Usuário não encontrado.' })
  }

  const phoneNumberId = userRecord.getString('meta_whatsapp_phone_number_id') || '1324150594116725'
  const accessToken = userRecord.getString('meta_whatsapp_access_token')

  if (!phoneNumberId || !accessToken) {
    return e.json(200, {
      success: false,
      error: 'Phone Number ID e Access Token não configurados.',
    })
  }

  const wabaId = userRecord.getString('meta_whatsapp_business_id') || '1727871165105009'

  try {
    // 1. Consultar campos detalhados do número de telefone
    const phoneFields = [
      'id',
      'display_phone_number',
      'verified_name',
      'code_verification_status',
      'quality_rating',
      'platform_type',
      'account_mode',
      'status',
      'host_platform',
      'messaging_limit_tier',
    ].join(',')

    const res = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneNumberId + '?fields=' + phoneFields,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 15,
    })

    // 2. Tentar consultar também registration_status separadamente se suportado pela versão
    let regStatusRes = null
    try {
      const rReg = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneNumberId + '?fields=registration_status',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 10,
      })
      if (rReg.statusCode >= 200 && rReg.statusCode < 300) {
        regStatusRes = rReg.json
      }
    } catch (_) {}

    // 3. Consultar status da WABA se wabaId disponível
    let wabaData = null
    if (wabaId) {
      try {
        const rWaba = $http.send({
          url:
            'https://graph.facebook.com/v21.0/' +
            wabaId +
            '?fields=id,name,timezone_id,account_review_status,message_template_namespace',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + accessToken },
          timeout: 10,
        })
        if (rWaba.statusCode >= 200 && rWaba.statusCode < 300) {
          wabaData = rWaba.json
        } else {
          wabaData = { error: rWaba.json && rWaba.json.error ? rWaba.json.error : rWaba.statusCode }
        }
      } catch (wErr) {
        wabaData = { error: wErr.message || String(wErr) }
      }
    }

    // 4. Consultar apps inscritos na WABA
    let subscribedAppsData = null
    if (wabaId) {
      try {
        const rSubs = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + wabaId + '/subscribed_apps',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + accessToken },
          timeout: 10,
        })
        if (rSubs.statusCode >= 200 && rSubs.statusCode < 300) {
          subscribedAppsData = rSubs.json
        } else {
          subscribedAppsData = {
            error: rSubs.json && rSubs.json.error ? rSubs.json.error : rSubs.statusCode,
          }
        }
      } catch (sErr) {
        subscribedAppsData = { error: sErr.message || String(sErr) }
      }
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const phoneData = res.json || {}
      if (regStatusRes && regStatusRes.registration_status) {
        phoneData.registration_status = regStatusRes.registration_status
      }

      const isVerified = phoneData.code_verification_status === 'VERIFIED'
      const isConnected = phoneData.status === 'CONNECTED'
      const isRegistered = isConnected && isVerified

      // Grava no system_logs para histórico
      try {
        const col = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(col)
        log.set('type', 'whatsapp_diagnostic')
        log.set(
          'message',
          'Diagnostic: status=' +
            phoneData.status +
            ' code_verification=' +
            phoneData.code_verification_status +
            ' is_registered=' +
            isRegistered,
        )
        log.set('user_id', userRecord.id)
        log.set(
          'details',
          JSON.stringify({
            phone: phoneData,
            waba: wabaData,
            subscribed_apps: subscribedAppsData,
          }),
        )
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        success: true,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        data: phoneData,
        waba: wabaData,
        subscribed_apps: subscribedAppsData,
        is_registered: isRegistered,
        status: phoneData.status || 'UNKNOWN',
        code_verification_status: phoneData.code_verification_status || 'UNKNOWN',
        quality_rating: phoneData.quality_rating || 'UNKNOWN',
        display_phone_number: phoneData.display_phone_number || '',
        verified_name: phoneData.verified_name || '',
        account_mode: phoneData.account_mode || '',
        platform_type: phoneData.platform_type || phoneData.host_platform || '',
        note: isConnected
          ? 'Número registrado e conectado à Cloud API com sucesso.'
          : 'Número com status PENDING: necessita de registro via POST /backend/v1/meta_whatsapp_register com PIN de 6 dígitos.',
      })
    }

    var metaError = {}
    try {
      metaError = res.json && res.json.error ? res.json.error : {}
    } catch (_) {
      metaError = { message: 'Resposta não-JSON da Meta API' }
    }

    var isTokenExpired =
      metaError.code === 190 ||
      (metaError.message && metaError.message.indexOf('Session has expired') !== -1)

    return e.json(200, {
      success: false,
      error: metaError.message || 'HTTP ' + res.statusCode,
      status_code: res.statusCode,
      error_code: metaError.code || 0,
      error_subcode: metaError.error_subcode || 0,
      is_token_expired: isTokenExpired,
      meta_error: metaError,
    })
  } catch (err) {
    return e.json(200, {
      success: false,
      error: 'Falha de comunicação: ' + (err.message || 'unknown'),
    })
  }
})

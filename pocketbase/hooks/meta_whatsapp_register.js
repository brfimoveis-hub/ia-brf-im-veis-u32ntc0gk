routerAdd('POST', '/backend/v1/meta_whatsapp_register', (e) => {
  let body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  const pin = (body.pin || '').toString().trim()
  const dataLocalization = (body.data_localization_region || '').toString().trim()

  // Validação estrita do PIN (obrigatório, exatamente 6 dígitos numéricos)
  if (!pin) {
    return e.json(400, {
      success: false,
      error: 'PIN de 6 dígitos é obrigatório para registrar o número na WhatsApp Cloud API.',
      error_code: 'pin_required',
    })
  }

  if (!/^\d{6}$/.test(pin)) {
    return e.json(400, {
      success: false,
      error: 'O PIN deve conter exatamente 6 dígitos numéricos (ex: "123456").',
      error_code: 'invalid_pin_format',
    })
  }

  // Identificação do usuário
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
    return e.json(404, { success: false, error: 'Usuário não encontrado.' })
  }

  const phoneNumberId = userRecord.getString('meta_whatsapp_phone_number_id') || '1239571259250639'
  const wabaId = userRecord.getString('meta_whatsapp_business_id') || '3542548689255402'
  const accessToken = userRecord.getString('meta_whatsapp_access_token')

  if (!phoneNumberId || !accessToken) {
    return e.json(400, {
      success: false,
      error: 'meta_whatsapp_phone_number_id e meta_whatsapp_access_token não estão configurados.',
      error_code: 'missing_credentials',
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
    })
  }

  // Monta payload de registro estrito conforme documentação da Meta Cloud API
  const registerPayload = {
    messaging_product: 'whatsapp',
    pin: pin,
  }
  if (dataLocalization) {
    registerPayload.data_localization_region = dataLocalization
  }

  const registerUrl = 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/register'

  // 1. Chamada de registro
  let registerRes = null
  try {
    registerRes = $http.send({
      url: registerUrl,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerPayload),
      timeout: 25,
    })
  } catch (netErr) {
    return e.json(500, {
      success: false,
      error: 'Falha de conexão com a Meta Graph API: ' + (netErr.message || String(netErr)),
      error_code: 'network_error',
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
    })
  }

  let registerJson = {}
  try {
    registerJson = registerRes.json || {}
  } catch (_) {}

  // Tratamento de erros específicos da Meta
  if (registerRes.statusCode < 200 || registerRes.statusCode >= 300) {
    const metaError = registerJson.error || {}
    const errorCode = metaError.code || 0
    const errorSubcode = metaError.error_subcode || 0
    const rawMessage = metaError.message || ''

    let friendlyMessage =
      'Falha ao registrar número na Meta Cloud API (HTTP ' + registerRes.statusCode + ').'
    let actionableHint = ''

    if (errorCode === 133005) {
      friendlyMessage =
        'PIN incorreto. O PIN de verificação de duas etapas informado não confere com o PIN já cadastrado para este número.'
      actionableHint =
        'Verifique o PIN criado na Meta ou redefina o PIN em WhatsApp Manager > Gerenciar Número > Verificação em duas etapas.'
    } else if (errorCode === 133016) {
      friendlyMessage =
        'Limite de tentativas excedido (133016). A Meta limita a 10 tentativas a cada 72 horas para este número.'
      actionableHint =
        'Aguarde o desbloqueio pela Meta (até 72 horas) antes de tentar registrar novamente.'
    } else if (errorCode === 190) {
      friendlyMessage = 'Token de acesso expirado ou inválido (código 190).'
      actionableHint = 'Atualize o token de acesso da Meta nas configurações de conexões.'
    } else if (errorCode === 100) {
      friendlyMessage = 'Parâmetro inválido na chamada de registro: ' + rawMessage
      actionableHint = 'Verifique o Phone Number ID e o formato do PIN.'
    } else if (errorCode === 200) {
      friendlyMessage = 'Permissão insuficiente no token para registrar este número.'
      actionableHint =
        'O token deve ter os escopos whatsapp_business_management e whatsapp_business_messaging.'
    } else if (rawMessage) {
      friendlyMessage = rawMessage
    }

    // Log do erro
    try {
      const col = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(col)
      log.set('type', 'whatsapp_register_failure')
      log.set('message', 'Register failed: code=' + errorCode + ' msg=' + friendlyMessage)
      log.set('user_id', userRecord.id)
      log.set(
        'details',
        JSON.stringify({
          status_code: registerRes.statusCode,
          meta_error: metaError,
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
        }),
      )
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: false,
      registered: false,
      error: friendlyMessage,
      hint: actionableHint,
      error_code: errorCode,
      error_subcode: errorSubcode,
      meta_error: metaError,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
    })
  }

  // 2. Registro com sucesso no endpoint da Meta! Agora faz GET de verificação pós-registro
  let postRegisterCheck = null
  try {
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

    const checkRes = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneNumberId + '?fields=' + phoneFields,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 15,
    })

    if (checkRes.statusCode >= 200 && checkRes.statusCode < 300) {
      postRegisterCheck = checkRes.json || {}
    } else {
      postRegisterCheck = { error: checkRes.json || checkRes.statusCode }
    }
  } catch (checkErr) {
    postRegisterCheck = { error: checkErr.message || String(checkErr) }
  }

  // Atualiza status do usuário no banco se conectado
  const phoneStatus = postRegisterCheck && postRegisterCheck.status ? postRegisterCheck.status : ''
  const displayPhone =
    postRegisterCheck && postRegisterCheck.display_phone_number
      ? postRegisterCheck.display_phone_number
      : ''

  try {
    if (phoneStatus === 'CONNECTED') {
      userRecord.set('meta_whatsapp_status', displayPhone || 'connected')
      userRecord.set('meta_token_status', 'valid')
      $app.saveNoValidate(userRecord)
    }
  } catch (_) {}

  // Registra log de auditoria
  try {
    const col = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(col)
    log.set('type', 'whatsapp_register_success')
    log.set(
      'message',
      'Phone registered successfully: status=' + phoneStatus + ' display=' + displayPhone,
    )
    log.set('user_id', userRecord.id)
    log.set(
      'details',
      JSON.stringify({
        register_response: registerJson,
        phone_verification: postRegisterCheck,
      }),
    )
    $app.save(log)
  } catch (_) {}

  return e.json(200, {
    success: true,
    registered: true,
    message: 'Número registrado com sucesso na WhatsApp Cloud API!',
    phone_number_id: phoneNumberId,
    waba_id: wabaId,
    register_response: registerJson,
    verification: postRegisterCheck,
    is_connected: phoneStatus === 'CONNECTED',
    status: phoneStatus || 'UNKNOWN',
    display_phone_number: displayPhone,
  })
})

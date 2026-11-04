// Hook para POST /backend/v1/meta_messenger/save_and_subscribe
// Valida o Page Access Token via GET /me, subscreve a Página ao Webhook via POST /{page-id}/subscribed_apps
// e salva os dados na coleção users e grava auditoria completa em system_logs

routerAdd(
  'POST',
  '/backend/v1/meta_messenger/save_and_subscribe',
  function (e) {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    var body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {}

    var token = (body.page_access_token || body.meta_page_access_token || '').trim()
    var targetPageId = (body.page_id || '1401557100168686').trim()

    if (!token) {
      return e.badRequestError('O Page Access Token é obrigatório.')
    }

    var sysLogsCol = $app.findCollectionByNameOrId('system_logs')

    // 1. Validação do Token via Graph API: GET /me
    var meRes = null
    try {
      meRes = $http.send({
        url: 'https://graph.facebook.com/v22.0/me?fields=id,name,category,access_token',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })
    } catch (netErr) {
      // Grava falha de rede em system_logs
      try {
        var logNet = new Record(sysLogsCol, {
          user_id: userId,
          type: 'meta_messenger_token_validation_error',
          message: 'Falha de rede ao validar Page Token da Página ' + targetPageId,
          details: String(netErr),
          payload: { page_id: targetPageId, error: String(netErr) },
        })
        $app.save(logNet)
      } catch (_) {}
      return e.badRequestError(
        'Erro de conexão com a Meta Graph API: ' + String(netErr.message || netErr),
      )
    }

    if (!meRes || meRes.statusCode < 200 || meRes.statusCode >= 300) {
      var errObj = (meRes && meRes.json && meRes.json.error) || {}
      var errMsg =
        errObj.message ||
        'Token inválido ou expirado pela Meta (HTTP ' + (meRes ? meRes.statusCode : 0) + ')'
      var errCode = errObj.code || 0
      var errSubcode = errObj.error_subcode || 0

      // Mensagens claras e amigáveis para códigos frequentes da Meta
      var friendlyMsg = errMsg
      if (errCode === 190) {
        friendlyMsg =
          'Token expirado ou inválido (código 190). Gere um novo Page Access Token no Graph API Explorer.'
      } else if (errCode === 10 || errCode === 200) {
        friendlyMsg =
          'Permissões insuficientes no token (código ' +
          errCode +
          '). Certifique-se de marcar pages_messaging, pages_manage_metadata, pages_show_list e instagram_manage_messages.'
      }

      try {
        var logFail = new Record(sysLogsCol, {
          user_id: userId,
          type: 'meta_messenger_token_validation_error',
          message: 'Falha ao validar Page Token: ' + friendlyMsg,
          details:
            'HTTP ' +
            (meRes ? meRes.statusCode : 0) +
            ' | Code: ' +
            errCode +
            ' | Subcode: ' +
            errSubcode,
          payload: { page_id: targetPageId, graph_error: errObj },
        })
        $app.save(logFail)
      } catch (_) {}

      return e.json(400, {
        success: false,
        error: friendlyMsg,
        code: errCode,
        subcode: errSubcode,
        raw_message: errMsg,
      })
    }

    var meData = meRes.json || {}
    var detectedPageId = meData.id ? String(meData.id) : targetPageId
    var detectedPageName = meData.name || 'Página do Facebook'

    // 2. Subscrição da Página ao Webhook: POST /{page-id}/subscribed_apps
    // Subscribed fields: messages, messaging_postbacks, messaging_referrals
    var subRes = null
    var subSuccess = false
    var subErrorMsg = ''
    var subErrorCode = 0

    try {
      subRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          detectedPageId +
          '/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_referrals',
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })

      if (subRes && subRes.statusCode >= 200 && subRes.statusCode < 300) {
        subSuccess = true
      } else {
        var subErr = (subRes && subRes.json && subRes.json.error) || {}
        subErrorCode = subErr.code || 0
        subErrorMsg = subErr.message || 'HTTP ' + (subRes ? subRes.statusCode : 0)
        if (subErrorCode === 10) {
          subErrorMsg =
            'Permissão pages_manage_metadata pendente ou app em revisão (código 10). A Página foi salva no CRM, mas a subscrição automática aguarda aprovação da permissão na Meta.'
        }
      }
    } catch (subExc) {
      subErrorMsg = 'Erro de rede na subscrição: ' + String(subExc.message || subExc)
    }

    // 3. Salva os dados no registro do usuário
    try {
      var user = $app.findRecordById('users', userId)
      user.set('meta_page_access_token', token)
      user.set('meta_instagram_page_token', token)
      $app.saveNoValidate(user)
    } catch (saveUserErr) {
      $app.logger().error('Falha ao salvar token no usuário', 'err', String(saveUserErr))
    }

    // 4. Registro de Auditoria em system_logs
    try {
      var auditType = subSuccess
        ? 'meta_messenger_subscribed_success'
        : 'meta_messenger_subscribed_warning'
      var auditMsg = subSuccess
        ? 'Página ' +
          detectedPageName +
          ' (' +
          detectedPageId +
          ') subscrita ao webhook com sucesso!'
        : 'Token validado para ' +
          detectedPageName +
          ' (' +
          detectedPageId +
          '), mas subscrição retornou aviso: ' +
          subErrorMsg

      var logSub = new Record(sysLogsCol, {
        user_id: userId,
        type: auditType,
        message: auditMsg,
        details:
          'Subscribed fields: messages,messaging_postbacks,messaging_referrals | Status: ' +
          (subSuccess ? 'OK' : 'Pendente'),
        payload: {
          page_id: detectedPageId,
          page_name: detectedPageName,
          subscribed: subSuccess,
          sub_error: subErrorMsg || null,
          sub_code: subErrorCode || null,
          me_data: meData,
        },
      })
      $app.save(logSub)
    } catch (_) {}

    return e.json(200, {
      success: true,
      page_id: detectedPageId,
      page_name: detectedPageName,
      subscribed: subSuccess,
      subscription_warning: subSuccess ? null : subErrorMsg,
      message: subSuccess
        ? 'Página "' + detectedPageName + '" conectada e subscrita com sucesso ao Webhook!'
        : 'Página "' + detectedPageName + '" conectada! Aviso de subscrição: ' + subErrorMsg,
    })
  },
  $apis.requireAuth(),
)

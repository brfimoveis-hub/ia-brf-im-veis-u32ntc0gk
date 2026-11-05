// Hook para POST /backend/v1/meta_messenger/save_and_subscribe
// Valida o Page Access Token via GET /me, subscreve a Página ao Webhook via POST /{page-id}/subscribed_apps
// e salva os dados na coleção users e grava auditoria completa em system_logs
//
// Robustez de tipo de token:
// - Se o token colado for um USER access token, GET /me?fields=id,name,category retorna
//   erro #100 ("Tried accessing nonexisting field (category)") ou um objeto sem "category".
//   Nesse caso, o hook converte sozinho: GET /me/accounts?fields=access_token,id,name,
//   localiza a Página alvo e prossegue com o PAGE access token dela.

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

    // 5. Trim do token colado: remove espaços e quebras de linha acidentais
    var token = String(body.page_access_token || body.meta_page_access_token || '').replace(
      /\s+/g,
      '',
    )
    var targetPageId = String(body.page_id || '1401557100168686').trim()
    var targetPageName = 'www.brfimoveis.com.br'

    if (!token) {
      return e.badRequestError('O Page Access Token é obrigatório.')
    }

    var sysLogsCol = $app.findCollectionByNameOrId('system_logs')

    var logErr = function (type, message, details, payload) {
      try {
        var rec = new Record(sysLogsCol, {
          user_id: userId,
          type: type,
          message: message,
          details: details || '',
          payload: payload || {},
        })
        $app.save(rec)
      } catch (_) {}
    }

    var graphMe = function (accessToken) {
      return $http.send({
        url: 'https://graph.facebook.com/v22.0/me?fields=id,name,category',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 15,
      })
    }

    // 1. Validação do Token via Graph API: GET /me?fields=id,name,category
    var meRes = null
    var meErr = null
    try {
      meRes = graphMe(token)
    } catch (netErr) {
      meErr = netErr
    }

    if (meErr) {
      // Falha de rede em system_logs
      logErr(
        'meta_messenger_token_validation_error',
        'Falha de rede ao validar token da Página ' + targetPageId,
        '',
        { page_id: targetPageId, error: String(meErr && meErr.message ? meErr.message : meErr) },
      )
      return e.badRequestError(
        'Erro de conexão com a Meta Graph API: ' + String(meErr.message || meErr),
      )
    }

    var meData = meRes && meRes.json ? meRes.json : {}
    var meErrObj = meData.error || {}
    var tokenType = 'page'
    var tokenConverted = false

    // 1.a Detecção de tipo: erro #100 de campo inexistente (category) => token de usuário
    var meMsgLower = String(meErrObj.message || '').toLowerCase()
    var isCategoryFieldError =
      meErrObj.code === 100 &&
      meMsgLower.indexOf('category') !== -1 &&
      (meMsgLower.indexOf('nonexisting') !== -1 || meMsgLower.indexOf('inexistente') !== -1)

    var isUserObject = !!(
      meRes &&
      meRes.statusCode >= 200 &&
      meRes.statusCode < 300 &&
      meData.id &&
      !meData.category
    )

    if (isCategoryFieldError || isUserObject) {
      tokenType = 'user'
      try {
        var det = new Record(sysLogsCol, {
          user_id: userId,
          type: 'meta_messenger_token_type_detected',
          message:
            'Token colado é do tipo USER (sem campo category). Iniciando conversão automática user→page.',
          details: 'GET /me code=' + (meErrObj.code || 0) + ' | ' + String(meErrObj.message || ''),
          payload: { page_id: targetPageId, graph_error: meErrObj || null },
        })
        $app.save(det)
      } catch (_) {}
    }

    // 2. AUTO-CONVERSÃO user→page
    if (tokenType === 'user') {
      var accountsRes = null
      var accountsErr = null
      try {
        accountsRes = $http.send({
          url: 'https://graph.facebook.com/v22.0/me/accounts?fields=access_token,id,name&limit=100',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + token },
          timeout: 15,
        })
      } catch (accNetErr) {
        accountsErr = accNetErr
      }

      if (accountsErr) {
        logErr(
          'meta_messenger_token_validation_error',
          'Falha de rede ao buscar Páginas do usuário para conversão user→page',
          '',
          { page_id: targetPageId, error: String(accountsErr.message || accountsErr) },
        )
        return e.badRequestError(
          'O token colado é de usuário e não temos acesso à lista de Páginas: ' +
            String(accountsErr.message || accountsErr),
        )
      }

      var accData = accountsRes && accountsRes.json ? accountsRes.json : {}
      var accErrObj = accData.error || {}
      if (accErrObj && accErrObj.code) {
        logErr(
          'meta_messenger_token_validation_error',
          'Erro da Graph API ao buscar Páginas do usuário: ' + String(accErrObj.message || ''),
          'code=' + (accErrObj.code || 0),
          { page_id: targetPageId, graph_error: accErrObj },
        )
        return e.json(400, {
          success: false,
          error:
            'O token colado é de usuário e não conseguimos listar as Páginas dele. Gere novamente no Graph API Explorer escolhendo "Token da Página" → www.brfimoveis.com.br',
          code: accErrObj.code,
          raw_message: String(accErrObj.message || ''),
        })
      }

      var pages = accData.data || []
      var pageToken = ''
      var pageName = ''
      for (var i = 0; i < pages.length; i++) {
        if (String(pages[i].id) === targetPageId && pages[i].access_token) {
          pageToken = pages[i].access_token
          pageName = pages[i].name || targetPageName
          break
        }
      }

      if (!pageToken) {
        logErr(
          'meta_messenger_token_validation_error',
          'Token de usuário sem acesso à Página ' + targetPageId + ' — não é possível converter',
          'Páginas visíveis: ' + pages.length,
          {
            page_id: targetPageId,
            visible_pages: pages.map(function (p) {
              return { id: p.id, name: p.name }
            }),
          },
        )
        return e.json(400, {
          success: false,
          error:
            'O token colado é de usuário e não tem acesso à Página www.brfimoveis.com.br. Gere novamente no Graph API Explorer escolhendo "Token da Página" → www.brfimoveis.com.br',
        })
      }

      // Valida o PAGE token recém-obtido
      var pageMeRes = null
      try {
        pageMeRes = graphMe(pageToken)
      } catch (pgNetErr) {
        logErr(
          'meta_messenger_token_validation_error',
          'Falha de rede ao validar o Page Token convertido',
          '',
          { page_id: targetPageId, error: String(pgNetErr.message || pgNetErr) },
        )
        return e.badRequestError(
          'Erro de conexão com a Meta Graph API ao validar o token da Página: ' +
            String(pgNetErr.message || pgNetErr),
        )
      }

      var pgData = pageMeRes && pageMeRes.json ? pageMeRes.json : {}
      var pgErrObj = pgData.error || {}
      if (
        !pageMeRes ||
        pageMeRes.statusCode < 200 ||
        pageMeRes.statusCode >= 300 ||
        pgErrObj.code ||
        !pgData.category
      ) {
        logErr(
          'meta_messenger_token_validation_error',
          'Token da Página convertido falhou na validação: ' + String(pgErrObj.message || ''),
          'HTTP ' + (pageMeRes ? pageMeRes.statusCode : 0) + ' | code=' + (pgErrObj.code || 0),
          { page_id: targetPageId, graph_error: pgErrObj || null },
        )
        return e.json(400, {
          success: false,
          error:
            'Conseguimos o token da Página www.brfimoveis.com.br, mas ele falhou na validação na Meta. Gere novamente no Graph API Explorer escolhendo "Token da Página" → www.brfimoveis.com.br',
          code: pgErrObj.code || 0,
          raw_message: String(pgErrObj.message || ''),
        })
      }

      token = pageToken
      tokenConverted = true
      meData = pgData

      try {
        var conv = new Record(sysLogsCol, {
          user_id: userId,
          type: 'meta_messenger_token_converted',
          message:
            'Token de usuário convertido automaticamente para o Page Token de ' +
            pageName +
            ' (' +
            targetPageId +
            '). Fluxo segue normal.',
          details: 'Conversão user→page concluída na Página ' + targetPageId,
          payload: { page_id: targetPageId, page_name: pageName },
        })
        $app.save(conv)
      } catch (_) {}
    }

    if (!meRes || meRes.statusCode < 200 || meRes.statusCode >= 300) {
      // Só chega aqui se for page token com erro genérico da Meta
      var errObj = meErrObj
      var errMsg =
        errObj.message ||
        'Token inválido ou expirado pela Meta (HTTP ' + (meRes ? meRes.statusCode : 0) + ')'
      var errCode = errObj.code || 0
      var errSubcode = errObj.error_subcode || 0

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

      logErr(
        'meta_messenger_token_validation_error',
        'Falha ao validar Page Token: ' + friendlyMsg,
        'HTTP ' +
          (meRes ? meRes.statusCode : 0) +
          ' | Code: ' +
          errCode +
          ' | Subcode: ' +
          errSubcode,
        { page_id: targetPageId, graph_error: errObj },
      )

      return e.json(400, {
        success: false,
        error: friendlyMsg,
        code: errCode,
        subcode: errSubcode,
        raw_message: errMsg,
      })
    }

    var detectedPageId = meData.id ? String(meData.id) : targetPageId
    var detectedPageName = meData.name || targetPageName

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
          (subSuccess ? 'OK' : 'Pendente') +
          (tokenConverted ? ' | Conversão user→page aplicada' : ''),
        payload: {
          page_id: detectedPageId,
          page_name: detectedPageName,
          subscribed: subSuccess,
          sub_error: subErrorMsg || null,
          sub_code: subErrorCode || null,
          token_type_detected: tokenType,
          token_converted: tokenConverted,
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
      token_type: tokenType,
      token_converted: tokenConverted,
      message: subSuccess
        ? 'Página "' + detectedPageName + '" conectada e subscrita com sucesso ao Webhook!'
        : 'Página "' + detectedPageName + '" conectada! Aviso de subscrição: ' + subErrorMsg,
    })
  },
  $apis.requireAuth(),
)

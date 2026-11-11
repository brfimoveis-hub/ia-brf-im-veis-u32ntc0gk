// Hook para POST /backend/v1/meta_messenger/save_and_subscribe
// Valida o token colado, subscreve a Página ao Webhook via POST /{page-id}/subscribed_apps
// e salva os dados na coleção users e grava auditoria completa em system_logs
//
// Robustez de tipo de token:
// - O token colado no painel costuma ser um USER access token gerado no Graph API Explorer
//   (como Bernadete). O hook detecta o tipo e converte sozinho: GET /me/accounts?fields=
//   access_token,id,name localiza a Página alvo e prossegue com o PAGE access token dela.
// - VALIDAÇÃO SEM CAMPO "category": esse campo é a única causa do erro #100
//   ("Tried accessing nonexisting field (category)") — usuários não o possuem. Nenhuma
//   consulta de validação pede "category".
// - Validação da Página: GET /{page_id}?fields=id,name COM O PAGE TOKEN — se o id
//   retornado for exatamente o da Página alvo, o token é da Página certa.
// - Toda chamada depois da conversão usa o PAGE TOKEN (nenhum resquício de token de usuário).
// - Se o page token não puder ser obtido (/me/accounts sem acesso à Página), a mensagem
//   amigável orienta regerar no Graph API Explorer com "Token da Página".

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

    // Trim do token colado: remove espaços e quebras de linha acidentais
    var token = String(body.page_access_token || body.meta_page_access_token || '').replace(
      /\s+/g,
      '',
    )
    var targetPageId = String(body.page_id || '1401557100168686').trim()
    var targetPageName = String(body.page_name || 'www.brfimoveis.com.br').trim()
    var GRAPH_BASE = 'https://graph.facebook.com/v22.0/'
    var GRAPH_FIELDS_SUBSCRIBE = 'messages,messaging_postbacks,messaging_referrals'
    var GRAPH_GET_PAGE = 'GET /{page_id}?fields=id,name com page token'

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

    var friendlyTokenError = function (errObj, httpStatus) {
      var code = (errObj && errObj.code) || 0
      var raw = String((errObj && errObj.message) || '')
      var friendly = raw || 'Token inválido ou expirado pela Meta (HTTP ' + (httpStatus || 0) + ')'
      if (code === 190) {
        friendly =
          'Token expirado ou inválido (código 190). Gere um novo Page Access Token no Graph API Explorer.'
      } else if (code === 10 || code === 200) {
        friendly =
          'Permissões insuficientes no token (código ' +
          code +
          '). Certifique-se de marcar pages_messaging, pages_manage_metadata, pages_show_list e instagram_manage_messages.'
      }
      return {
        friendly: friendly,
        code: code,
        raw: raw,
        subcode: (errObj && errObj.error_subcode) || 0,
      }
    }

    // Consulta de validação da Página: GET /{page_id}?fields=id,name — SEM "category".
    // Prova que o token é da Página certa conferindo o id retornado.
    var validatePageToken = function (pageToken, pageId) {
      var res = null
      try {
        res = $http.send({
          url: GRAPH_BASE + pageId + '?fields=id,name',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + pageToken },
          timeout: 15,
        })
      } catch (netErr) {
        return { netError: String(netErr && netErr.message ? netErr.message : netErr) }
      }
      var data = res && res.json ? res.json : {}
      var errObj = data.error || {}
      var ok =
        !!res &&
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        !errObj.code &&
        String(data.id || '') === pageId
      return {
        ok: ok,
        returnedId: String(data.id || ''),
        returnedName: String(data.name || ''),
        errObj: errObj,
        httpStatus: res ? res.statusCode : 0,
        validation: ok
          ? {
              confirmed_page_id: pageId,
              returned_page_id: String(data.id || ''),
              returned_page_name: String(data.name || ''),
              method: GRAPH_GET_PAGE,
            }
          : {
              confirmed_page_id: null,
              returned_page_id: String(data.id || ''),
              method: GRAPH_GET_PAGE,
              graph_error: errObj || null,
              http_status: res ? res.statusCode : 0,
            },
      }
    }

    // Consulta de permissões do token: GET /me/permissions — usada para dizer
    // EXATAMENTE quais permissões faltam quando a conversão user→page não puder seguir.
    var fetchGrantedPermissions = function (accessToken) {
      var res = null
      try {
        res = $http.send({
          url: GRAPH_BASE + 'me/permissions',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + accessToken },
          timeout: 15,
        })
      } catch (permNetErr) {
        return {
          netError: String(permNetErr && permNetErr.message ? permNetErr.message : permNetErr),
        }
      }
      var data = res && res.json ? res.json : {}
      var errObj = data.error || {}
      var granted = []
      var dataList = data.data || []
      for (var pi = 0; pi < dataList.length; pi++) {
        if (String(dataList[pi].status) === 'granted' && dataList[pi].permission) {
          granted.push(String(dataList[pi].permission))
        }
      }
      return {
        ok: !!res && res.statusCode >= 200 && res.statusCode < 300 && !errObj.code,
        granted: granted,
        errObj: errObj,
        httpStatus: res ? res.statusCode : 0,
      }
    }

    // Monta mensagem amigável listando exatamente as permissões que faltam
    var REQUIRED_USER_PERMS = ['pages_show_list', 'pages_manage_metadata']
    var buildMissingPermissionsError = function (grantedList) {
      var missing = []
      for (var mi = 0; mi < REQUIRED_USER_PERMS.length; mi++) {
        if (grantedList.indexOf(REQUIRED_USER_PERMS[mi]) === -1) {
          missing.push(REQUIRED_USER_PERMS[mi])
        }
      }
      if (!missing.length) {
        return null
      }
      var missingText = missing
        .map(function (m) {
          return '"' + m + '"'
        })
        .join(', ')
      return (
        'O token colado é de usuário e não tem ' +
        (missing.length === 1 ? 'a permissão' : 'as permissões') +
        ' ' +
        missingText +
        '. No Graph API Explorer, adicione ' +
        (missing.length === 1 ? 'essa permissão' : 'essas permissões') +
        ' à lista e gere o token novamente (Perfil "Mauro" do Chrome → app BRF Imóveis 2).'
      )
    }

    // Localiza a Página alvo em /me/accounts: primeiro pelo ID, depois pelo nome
    // (regra do Mauro: nunca depender só de um ID fixo — busca parametrizada por nome/ID).
    var findTargetPage = function (pages) {
      var wantedName = String(targetPageName || '').toLowerCase()
      var wantedNameBare = wantedName.replace(/^www\./, '')
      for (var fi = 0; fi < pages.length; fi++) {
        if (String(pages[fi].id) === targetPageId && pages[fi].access_token) {
          return pages[fi]
        }
      }
      for (var fj = 0; fj < pages.length; fj++) {
        var nm = String(pages[fj].name || '').toLowerCase()
        if (pages[fj].access_token && (nm === wantedName || nm === wantedNameBare)) {
          return pages[fj]
        }
      }
      for (var fk = 0; fk < pages.length; fk++) {
        var nk = String(pages[fk].name || '').toLowerCase()
        if (
          pages[fk].access_token &&
          wantedName &&
          nk.indexOf(wantedName) !== -1 &&
          nk.indexOf('brf') !== -1
        ) {
          return pages[fk]
        }
      }
      return null
    }

    // Consulta de tipo de token: GET /me?fields=id,name — SEM "category",
    // que não existe em objetos de usuário e é a causa do erro #100.
    var meRes = null
    var meErr = null
    try {
      meRes = $http.send({
        url: GRAPH_BASE + 'me?fields=id,name',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })
    } catch (netErr) {
      meErr = netErr
    }

    if (meErr) {
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
    var pageTokenValidation = null

    // 1. Detecção de tipo: erro #100 de "category" no /me, ou /me resolvendo num id
    // diferente da Página alvo (o /me de um usuário nunca é o id da Página).
    var isCategoryFieldError =
      meErrObj.code === 100 &&
      String(meErrObj.message || '')
        .toLowerCase()
        .indexOf('category') !== -1
    var meResolvedOk = !!(
      meRes &&
      meRes.statusCode >= 200 &&
      meRes.statusCode < 300 &&
      meData.id &&
      !meErrObj.code
    )
    var isUserObject = !!(meResolvedOk && String(meData.id) !== targetPageId)

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
    // Credenciais do app (BRF Imóveis 2): lidas do registro do usuário (migração
    // 0125/0131) com fallback para as env vars do backend (META_APP_ID/META_APP_SECRET).
    var appCredsUser = null
    try {
      appCredsUser = $app.findRecordById('users', userId)
    } catch (_) {}
    var appIdForExchange = appCredsUser ? (appCredsUser.getString('meta_app_id') || '').trim() : ''
    var appSecretForExchange = appCredsUser
      ? (appCredsUser.getString('meta_app_secret') || '').trim()
      : ''
    if (!appIdForExchange || !appSecretForExchange) {
      try {
        appIdForExchange = appIdForExchange || String($os.getenv('META_APP_ID') || '').trim()
        appSecretForExchange =
          appSecretForExchange || String($os.getenv('META_APP_SECRET') || '').trim()
      } catch (_) {}
    }
    // Fallback adicional: credenciais Instagram salvas pelo fluxo OAuth (mesmo app)
    if ((!appIdForExchange || !appSecretForExchange) && appCredsUser) {
      appIdForExchange =
        appIdForExchange || (appCredsUser.getString('meta_instagram_app_id') || '').trim()
      appSecretForExchange =
        appSecretForExchange || (appCredsUser.getString('meta_instagram_app_secret') || '').trim()
    }

    // 2a. Token de USUÁRIO de longa duração: fb_exchange_token (60 dias).
    // Page token gerado a partir de user token estendido NÃO EXPIRA enquanto o
    // usuário não revogar o app/trocar a senha — é isso que torna o token na
    // prática permanente. Falha aqui não bloqueia: cai para o token original.
    var tokenExtended = false
    var tokenExpiresAt = 0
    if (appIdForExchange && appSecretForExchange) {
      try {
        var exchRes = $http.send({
          url:
            'https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token' +
            '&client_id=' +
            encodeURIComponent(appIdForExchange) +
            '&client_secret=' +
            encodeURIComponent(appSecretForExchange) +
            '&fb_exchange_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 15,
        })
        var exchData = exchRes && exchRes.json ? exchRes.json : {}
        if (exchRes.statusCode >= 200 && exchRes.statusCode < 300 && exchData.access_token) {
          token = String(exchData.access_token)
          tokenExtended = true
          console.log(
            '[SAVE_SUBSCRIBE] Token de usuário estendido (fb_exchange_token OK, ~60 dias).',
          )
        } else {
          console.warn(
            '[SAVE_SUBSCRIBE] fb_exchange_token não aceito (HTTP ' +
              (exchRes ? exchRes.statusCode : 0) +
              '): ' +
              JSON.stringify(exchData.error || exchData),
          )
        }
      } catch (exchErr) {
        console.warn('[SAVE_SUBSCRIBE] Erro de rede no fb_exchange_token: ' + String(exchErr))
      }
    } else {
      console.warn(
        '[SAVE_SUBSCRIBE] meta_app_id/meta_app_secret ausentes (usuário e env) — estender token não possível, seguindo com token curto.',
      )
    }

    if (tokenType === 'user') {
      var accountsRes = null
      var accountsErr = null
      try {
        accountsRes = $http.send({
          url: GRAPH_BASE + 'me/accounts?fields=access_token,id,name&limit=100',
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
      var targetPage = findTargetPage(pages)
      if (targetPage) {
        pageToken = targetPage.access_token
        pageName = targetPage.name || targetPageName
        targetPageId = String(targetPage.id || targetPageId)
      }

      if (!pageToken) {
        // Consulta /me/permissions para dizer EXATAMENTE quais permissões faltam
        var permCheck = fetchGrantedPermissions(token)
        var grantedList = permCheck && permCheck.granted ? permCheck.granted : []
        var missingMsg = buildMissingPermissionsError(grantedList)
        logErr(
          'meta_messenger_token_validation_error',
          missingMsg ||
            'Token de usuário sem acesso à Página ' + targetPageId + ' — não é possível converter',
          'Páginas visíveis: ' +
            pages.length +
            ' | permissões concedidas: ' +
            grantedList.join(', '),
          {
            page_id: targetPageId,
            visible_pages: pages.map(function (p) {
              return { id: p.id, name: p.name }
            }),
            granted_permissions: grantedList,
          },
        )
        return e.json(400, {
          success: false,
          error:
            missingMsg ||
            'O token de usuário é válido e tem as permissões, mas a Página www.brfimoveis.com.br não apareceu em /me/accounts. Confirme que o perfil que gerou o token é admin da Página e gere o token novamente no Graph API Explorer (app BRF Imóveis 2).',
          granted_permissions: grantedList,
        })
      }

      // Valida o PAGE TOKEN recém-obtido contra a Página alvo (sem "category")
      var pgCheck = validatePageToken(pageToken, targetPageId)
      if (pgCheck.netError) {
        logErr(
          'meta_messenger_token_validation_error',
          'Falha de rede ao validar o Page Token convertido',
          '',
          { page_id: targetPageId, error: pgCheck.netError },
        )
        return e.badRequestError(
          'Erro de conexão com a Meta Graph API ao validar o token da Página: ' + pgCheck.netError,
        )
      }
      pageTokenValidation = pgCheck.validation

      if (!pgCheck.ok) {
        logErr(
          'meta_messenger_token_validation_error',
          'Page Token não confirmou a Página ' + targetPageId + ' via GET /{page_id}',
          'HTTP ' +
            pgCheck.httpStatus +
            ' | code=' +
            (pgCheck.errObj.code || 0) +
            ' | id_retornado=' +
            pgCheck.returnedId,
          { page_id: targetPageId, page_token_validation: pageTokenValidation },
        )
        return e.json(400, {
          success: false,
          error:
            'Conseguimos o token da Página www.brfimoveis.com.br, mas ele falhou na validação na Meta. Gere novamente no Graph API Explorer escolhendo "Token da Página" → www.brfimoveis.com.br',
          code: pgCheck.errObj.code || 0,
          raw_message: String(pgCheck.errObj.message || ''),
        })
      }

      token = pageToken
      tokenConverted = true
      meData = { id: targetPageId, name: pgCheck.returnedName || pageName || targetPageName }

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
          details:
            'Conversão user→page concluída | Página confirmada via GET /{page_id}: ' + targetPageId,
          payload: {
            page_id: targetPageId,
            page_name: pageName,
            page_token_validation: pageTokenValidation,
          },
        })
        $app.save(conv)
      } catch (_) {}
    }

    // 3. Token informado já é de Página: valida contra a Página alvo (sem "category")
    if (!tokenConverted) {
      var finalCheck = validatePageToken(token, targetPageId)
      if (finalCheck.netError) {
        logErr(
          'meta_messenger_token_validation_error',
          'Falha de rede ao validar o Page Token informado',
          '',
          { page_id: targetPageId, error: finalCheck.netError },
        )
        return e.badRequestError(
          'Erro de conexão com a Meta Graph API ao validar o token da Página: ' +
            finalCheck.netError,
        )
      }
      pageTokenValidation = finalCheck.validation

      if (!finalCheck.ok) {
        var fErr = friendlyTokenError(finalCheck.errObj, finalCheck.httpStatus)
        logErr(
          'meta_messenger_token_validation_error',
          'Falha ao validar Page Token: ' + fErr.friendly,
          'HTTP ' + finalCheck.httpStatus + ' | Code: ' + fErr.code + ' | Subcode: ' + fErr.subcode,
          {
            page_id: targetPageId,
            graph_error: finalCheck.errObj,
            page_token_validation: pageTokenValidation,
          },
        )
        return e.json(400, {
          success: false,
          error: fErr.friendly,
          code: fErr.code,
          subcode: fErr.subcode,
          raw_message: fErr.raw,
        })
      }

      meData = { id: targetPageId, name: finalCheck.returnedName || targetPageName }
    }

    var detectedPageId = targetPageId
    var detectedPageName = meData.name || targetPageName

    // 4. Subscrição da Página ao Webhook: POST /{page-id}/subscribed_apps
    var subRes = null
    var subSuccess = false
    var subErrorMsg = ''
    var subErrorCode = 0

    try {
      subRes = $http.send({
        url:
          GRAPH_BASE +
          detectedPageId +
          '/subscribed_apps?subscribed_fields=' +
          GRAPH_FIELDS_SUBSCRIBE,
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

    // 5. Salva o TOKEN DA PÁGINA no registro do usuário (nunca o token de usuário)
    try {
      var user = $app.findRecordById('users', userId)
      user.set('meta_page_access_token', token)
      user.set('meta_instagram_page_token', token)
      try {
        user.set('meta_token_status', 'active')
      } catch (_) {}
      $app.saveNoValidate(user)
    } catch (saveUserErr) {
      $app.logger().error('Falha ao salvar token no usuário', 'err', String(saveUserErr))
    }

    // 5a. Auditoria da extensão (fb_exchange_token) — visível no painel de logs
    if (tokenExtended) {
      try {
        var extLog = new Record(sysLogsCol, {
          user_id: userId,
          type: 'meta_token_extended',
          message:
            'Token estendido via fb_exchange_token (longa duração ~60 dias) antes da conversão user→page. Page token gerado a partir dele não expira enquanto o usuário não revogar o app.',
          details: 'Página ' + targetPageId + ' (' + targetPageName + ')',
          payload: { page_id: targetPageId, extended: true },
        })
        $app.save(extLog)
      } catch (_) {}
    }

    // 6. Registro de Auditoria em system_logs
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
          'Subscribed fields: ' +
          GRAPH_FIELDS_SUBSCRIBE +
          ' | Status: ' +
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
          page_token_validation: pageTokenValidation,
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
      page_validation: pageTokenValidation,
      message: subSuccess
        ? 'Página "' + detectedPageName + '" conectada e subscrita com sucesso ao Webhook!'
        : 'Página "' + detectedPageName + '" conectada! Aviso de subscrição: ' + subErrorMsg,
    })
  },
  $apis.requireAuth(),
)

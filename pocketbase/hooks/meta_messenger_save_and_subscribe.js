// Hook para POST /backend/v1/meta_messenger_save_and_subscribe
// (rota única — a mesma chamada pelo front em src/services/meta_messenger.ts;
// era registrada como /backend/v1/meta_messenger/save_and_subscribe e o front
// recebia 404 "The requested resource wasn't found" ao validar o token.)
// ORDEM OBRIGATÓRIA (correção da falha silenciosa da v0.0.1404):
//   1. VALIDA o token colado (GET /me?fields=id,name — sem "category").
//   2. ESTENDE para longa duração (~60 dias) via GET /oauth/access_token
//      (grant_type=fb_exchange_token, client_id=meta_app_id, client_secret=
//      meta_app_secret, fb_exchange_token=token colado). Se falhar ou as
//      credenciais do app faltarem, o fluxo PARA com erro: NUNCA salvamos o
//      canal como "Conectado" com token de ~1 hora.
//   3. SÓ ENTÃO deriva o Page Token (GET /me/accounts) a partir do token
//      long-lived — token de página derivado de token de usuário estendido não
//      expira enquanto o usuário não revogar o app.
//   4. Subscreve a Página ao webhook e salva no usuário.
// Cada etapa grava system_logs com resultado explícito.
//
// Regras robustez de tipo de token:
// - O token colado costuma ser USER token do Graph API Explorer (Bernadete). O
//   /me de usuário não resolve no id da Página alvo (nem tem "category"):
//   detectamos e seguimos o fluxo de conversão.
// - VALIDAÇÃO SEM CAMPO "category" (única causa do erro #100 em usuários).
// - Validação da Página: GET /{page_id}?fields=id,name COM o page token.
//
// REGRA DO PROJETO: handlers só referenciam funções/constantes declaradas
// DENTRO deles mesmos (JSVM executa callbacks em pool separado — helpers
// top-level somem do bundle deployado, v0.0.1399).

routerAdd(
  'POST',
  '/backend/v1/meta_messenger_save_and_subscribe',
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
      var subcode = (errObj && errObj.error_subcode) || 0
      var raw = String((errObj && errObj.message) || '')
      var friendly = raw || 'Token inválido ou expirado pela Meta (HTTP ' + (httpStatus || 0) + ')'
      if (code === 190 && subcode === 467) {
        friendly =
          'Sessão invalidada porque saíram do Facebook — gere o token novamente e NÃO saia da conta do Facebook depois de gerar o token.'
      } else if (code === 190 && subcode === 463) {
        friendly = 'Token expirado — renove gerando um novo token no Graph API Explorer.'
      } else if (code === 190) {
        friendly =
          'Token expirado ou invalidado (código 190). Gere um novo token no Graph API Explorer e NÃO saia da conta do Facebook depois de gerar.'
      } else if (code === 10 || code === 200) {
        friendly =
          'Permissões insuficientes no token (código ' +
          code +
          '). Certifique-se de marcar pages_messaging, pages_manage_metadata, pages_show_list e instagram_manage_messages.'
      }
      return { friendly: friendly, code: code, subcode: subcode, raw: raw }
    }

    // Salva status de erro no usuário (banner de /configuracoes fica vermelho)
    var setUserTokenError = function (message, code, subcode) {
      try {
        var u = $app.findRecordById('users', userId)
        u.set('meta_token_status', 'expired')
        try {
          u.set('meta_capi_error', String(message || '').slice(0, 500))
        } catch (_) {}
        $app.saveNoValidate(u)
      } catch (_) {}
      logErr(
        'meta_messenger_extension_failed',
        message,
        'code=' + (code || 0) + ' subcode=' + (subcode || 0),
        {
          page_id: targetPageId,
          graph_code: code || null,
          graph_subcode: subcode || null,
        },
      )
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

    // ----------------------------------------------------------------------------
    // PASSO 1 — VALIDAÇÃO INICIAL do token colado (GET /me?fields=id,name,
    // SEM "category": campo que não existe em usuários e causa o erro #100).
    // ----------------------------------------------------------------------------
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

    // Se o TOKEN COLADO já chega morto (190), não há nada a estender: erro
    // amigável imediato, status de erro no usuário e nada salvo como conectado.
    if (meErrObj && (meErrObj.code === 190 || (meRes && meRes.statusCode === 401))) {
      var deadTok = friendlyTokenError(meErrObj, meRes ? meRes.statusCode : 0)
      setUserTokenError(
        'Token colado já rejeitado pela Meta: ' + deadTok.friendly,
        deadTok.code,
        deadTok.subcode,
      )
      return e.json(400, {
        success: false,
        error: deadTok.friendly,
        code: deadTok.code,
        subcode: deadTok.subcode,
        raw_message: deadTok.raw,
      })
    }

    // Detecção de tipo: erro #100 de "category" no /me, ou /me resolvendo num id
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
            'Token colado é do tipo USER. Fluxo OBRIGATÓRIO: estender para ~60 dias (fb_exchange_token) ANTES de derivar o Page Token.',
          details: 'GET /me code=' + (meErrObj.code || 0) + ' | ' + String(meErrObj.message || ''),
          payload: { page_id: targetPageId, graph_error: meErrObj || null },
        })
        $app.save(det)
      } catch (_) {}
    }

    // ----------------------------------------------------------------------------
    // PASSO 2 — EXTENSÃO OBRIGATÓRIA para longa duração (~60 dias) via
    // fb_exchange_token. Credenciais do app (BRF Imóveis 2): lidas do registro
    // do usuário (migração 0125/0131) com fallback para env vars do backend.
    // Falha aqui = fluxo PARA (nunca seguir com token curto).
    // ----------------------------------------------------------------------------
    var tokenExtended = false
    var tokenExpiresIn = 0

    if (tokenType === 'user') {
      var appCredsUser = null
      try {
        appCredsUser = $app.findRecordById('users', userId)
      } catch (_) {}
      var appIdForExchange = appCredsUser
        ? (appCredsUser.getString('meta_app_id') || '').trim()
        : ''
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

      if (!appIdForExchange || !appSecretForExchange) {
        var credsMsg =
          'Extensão para ~60 dias NÃO foi possível: faltam as credenciais do app (meta_app_id / meta_app_secret). O token colado expira em ~1 hora. Salve as credenciais do app BRF Imóveis 2 no CRM ou renove o token pela ferramenta oficial de extensão da Meta antes de conectar.'
        setUserTokenError(credsMsg, 0, 0)
        return e.json(400, {
          success: false,
          error: credsMsg,
          code: 0,
          subcode: 0,
          reason: 'missing_app_credentials',
        })
      }

      var exchRes = null
      var exchErr = null
      try {
        exchRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token' +
            '&client_id=' +
            encodeURIComponent(appIdForExchange) +
            '&client_secret=' +
            encodeURIComponent(appSecretForExchange) +
            '&fb_exchange_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 20,
        })
      } catch (exchNetErr) {
        exchErr = exchNetErr
      }

      if (exchErr) {
        var netMsg =
          'Extensão do token para ~60 dias FALHOU por erro de rede: ' +
          String(exchErr.message || exchErr) +
          '. Nada foi salvo — tente colar o token novamente.'
        setUserTokenError(netMsg, 0, 0)
        return e.json(400, { success: false, error: netMsg, reason: 'extension_network_error' })
      }

      var exchData = exchRes && exchRes.json ? exchRes.json : {}
      var exchErrObj = exchData.error || {}
      if (
        exchRes &&
        exchRes.statusCode >= 200 &&
        exchRes.statusCode < 300 &&
        exchData.access_token
      ) {
        token = String(exchData.access_token)
        tokenExtended = true
        tokenExpiresIn = Number(exchData.expires_in || 0) || 0
        try {
          var extOk = new Record(sysLogsCol, {
            user_id: userId,
            type: 'meta_token_extended',
            message: tokenExpiresIn
              ? 'Token de usuário estendido para longa duração: ' +
                Math.round(tokenExpiresIn / 86400) +
                ' dias (' +
                tokenExpiresIn +
                ' segundos). Page Token será derivado deste token long-lived.'
              : 'Token de usuário estendido para longa duração (~60 dias). Page Token será derivado deste token long-lived.',
            details:
              'fb_exchange_token OK | app_id=' +
              appIdForExchange +
              (tokenExpiresIn ? ' | expires_in=' + tokenExpiresIn + 's' : ''),
            payload: {
              page_id: targetPageId,
              extended: true,
              expires_in: tokenExpiresIn || null,
            },
          })
          $app.save(extOk)
        } catch (_) {}
      } else {
        // Extensão FALHOU: registrar o erro bruto da Meta e PARAR.
        var extFail = friendlyTokenError(exchErrObj, exchRes ? exchRes.statusCode : 0)
        var failMsg =
          'Extensão do token para ~60 dias FALHOU na Meta: ' +
          extFail.friendly +
          (extFail.raw ? ' (Meta: ' + extFail.raw + ')' : '') +
          ' Nada foi salvo — o canal NÃO foi conectado.'
        setUserTokenError(failMsg, extFail.code, extFail.subcode)
        return e.json(400, {
          success: false,
          error: failMsg,
          code: extFail.code,
          subcode: extFail.subcode,
          raw_message: extFail.raw,
          reason: 'token_extension_failed',
        })
      }
    }

    // ----------------------------------------------------------------------------
    // PASSO 3 — CONVERSÃO user→page (só com token long-lived) ou validação do
    // Page Token informado.
    // ----------------------------------------------------------------------------
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
            'O token de usuário (já estendido para ~60 dias) não conseguiu listar as Páginas dele. Gere novamente no Graph API Explorer escolhendo "Token da Página" → www.brfimoveis.com.br',
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
            'Token de usuário estendido sem acesso à Página ' +
              targetPageId +
              ' — não é possível converter',
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
            'O token de usuário estendido é válido e tem as permissões, mas a Página www.brfimoveis.com.br não apareceu em /me/accounts. Confirme que o perfil que gerou o token é admin da Página e gere o token novamente no Graph API Explorer (app BRF Imóveis 2).',
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
            'Conseguimos o token da Página www.brfimoveis.com.br (derivado do token estendido de ~60 dias), mas ele falhou na validação na Meta. Gere novamente no Graph API Explorer escolhendo "Token da Página" → www.brfimoveis.com.br',
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
            'Page Token de ' +
            pageName +
            ' (' +
            targetPageId +
            ') derivado do token de usuário LONG-LIVED (~60 dias). Token de página derivado de token estendido não expira enquanto o usuário não revogar o app.',
          details:
            'Conversão user→page concluída | Página confirmada via GET /{page_id}: ' +
            targetPageId +
            (tokenExpiresIn
              ? ' | token de usuário estendido com expires_in=' + tokenExpiresIn + 's'
              : ''),
          payload: {
            page_id: targetPageId,
            page_name: pageName,
            page_token_validation: pageTokenValidation,
            user_token_extended: tokenExtended,
            user_token_expires_in: tokenExpiresIn || null,
          },
        })
        $app.save(conv)
      } catch (_) {}
    }

    // Token informado já é de Página: valida contra a Página alvo (sem "category")
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

    // ----------------------------------------------------------------------------
    // PASSO 4 — Subscrição da Página ao Webhook: POST /{page-id}/subscribed_apps
    // ----------------------------------------------------------------------------
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

    // ----------------------------------------------------------------------------
    // PASSO 5 — Salva o TOKEN DA PÁGINA long-lived no registro do usuário.
    // Só chegamos aqui com a extensão concluída (user token) ou com um page
    // token validado (colado como página).
    // ----------------------------------------------------------------------------
    try {
      var user = $app.findRecordById('users', userId)
      user.set('meta_page_access_token', token)
      user.set('meta_instagram_page_token', token)
      user.set('meta_token_status', 'active')
      try {
        user.set('meta_capi_error', '')
      } catch (_) {}
      $app.saveNoValidate(user)
    } catch (saveUserErr) {
      $app.logger().error('Falha ao salvar token no usuário', 'err', String(saveUserErr))
    }

    // 5a. Auditoria final da extensão (fb_exchange_token) — visível no painel de logs
    if (tokenExtended) {
      try {
        var extLog = new Record(sysLogsCol, {
          user_id: userId,
          type: 'meta_token_extended',
          message:
            'Fluxo concluído: token estendido via fb_exchange_token (~60 dias) ANTES da conversão user→page. Page token derivado não expira enquanto o usuário não revogar o app.',
          details:
            'Página ' +
            targetPageId +
            ' (' +
            targetPageName +
            ')' +
            (tokenExpiresIn ? ' | expires_in=' + tokenExpiresIn + 's' : ''),
          payload: {
            page_id: targetPageId,
            extended: true,
            expires_in: tokenExpiresIn || null,
          },
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
          (tokenConverted ? ' | Conversão user→page aplicada' : '') +
          (tokenExtended ? ' | Extensão ~60 dias aplicada ANTES da conversão' : ''),
        payload: {
          page_id: detectedPageId,
          page_name: detectedPageName,
          subscribed: subSuccess,
          sub_error: subErrorMsg || null,
          sub_code: subErrorCode || null,
          token_type_detected: tokenType,
          token_converted: tokenConverted,
          token_extended_before_conversion: tokenExtended,
          user_token_expires_in: tokenExpiresIn || null,
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
      token_extended: tokenExtended,
      token_expires_in: tokenExpiresIn || null,
      page_validation: pageTokenValidation,
      message: subSuccess
        ? 'Página "' +
          detectedPageName +
          '" conectada com token de longa duração (~60 dias) e subscrita ao Webhook!'
        : 'Página "' +
          detectedPageName +
          '" conectada com token de longa duração (~60 dias)! Aviso de subscrição: ' +
          subErrorMsg,
    })
  },
  $apis.requireAuth(),
)

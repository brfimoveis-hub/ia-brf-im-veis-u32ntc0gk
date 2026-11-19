// Endpoint de PROVA (somente leitura) para validar, sem clicar em "Salvar e
// Assinar", o mesmo caminho do hook meta_messenger_save_and_subscribe:
//   GET /backend/v1/meta_token_paths_probe?token=...&page_id=...
// Chamadas: GET /me, GET /me/accounts, GET /me/permissions — todas COM
// appsecret_proof (mesma readAppCreds do hook de salvar) e NUNCA persistindo
// nada (nenhum user.set, nenhum token salvo). Auditoria vai para system_logs
// (exigência do dono: provar proof + resposta real da Graph).
// Regra do projeto: tudo que o handler usa é declarado DENTRO dele (v0.0.1399).

routerAdd(
  'GET',
  '/backend/v1/meta_token_paths_probe',
  function (e) {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    var q = e.requestInfo().query || {}
    var token = String(q.token || '').replace(/\s+/g, '')
    if (!token) {
      return e.badRequestError('Parâmetro "token" é obrigatório (token de usuário válido).')
    }
    var targetPageId = String(q.page_id || '1401557100168686').trim()
    var GRAPH_BASE = 'https://graph.facebook.com/v22.0/'

    // Mesma precedência do hook de salvar: registro do usuário, depois env.
    var appCredsCache = null
    var appCredsRead = false
    var readAppCreds = function () {
      if (appCredsRead) return appCredsCache
      appCredsRead = true
      var appId = ''
      var appSecret = ''
      try {
        var credUser = $app.findRecordById('users', userId)
        appId = (credUser.getString('meta_app_id') || '').trim()
        appSecret = (credUser.getString('meta_app_secret') || '').trim()
        if (!appId || !appSecret) {
          appId = appId || (credUser.getString('meta_instagram_app_id') || '').trim()
          appSecret = appSecret || (credUser.getString('meta_instagram_app_secret') || '').trim()
        }
      } catch (_) {}
      if (!appId || !appSecret) {
        try {
          appId = appId || String($os.getenv('META_APP_ID') || '').trim()
          appSecret = appSecret || String($os.getenv('META_APP_SECRET') || '').trim()
        } catch (_) {}
      }
      if (appId && appSecret) appCredsCache = { id: appId, secret: appSecret }
      return appCredsCache
    }

    var proofParam = function (accessToken) {
      var creds = readAppCreds()
      if (!creds || !creds.secret || !accessToken) return ''
      try {
        return '&appsecret_proof=' + $security.hs256(String(accessToken), creds.secret)
      } catch (proofErr) {
        return ''
      }
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

    var graphGet = function (path) {
      try {
        return $http.send({
          url: GRAPH_BASE + path + proofParam(token),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + token },
          timeout: 15,
        })
      } catch (netErr) {
        return { netError: String(netErr && netErr.message ? netErr.message : netErr) }
      }
    }

    // ---- GET /me -------------------------------------------------------------
    var meRes = graphGet('me?fields=id,name')
    var meData = meRes && meRes.json && !meRes.netError ? meRes.json : {}
    var meErrObj = meData.error || {}

    // ---- GET /me/accounts ----------------------------------------------------
    var accRes = graphGet('me/accounts?fields=access_token,id,name&limit=100')
    var accData = accRes && accRes.json && !accRes.netError ? accRes.json : {}
    var accErrObj = accData.error || {}
    var pages = accData.data || []
    var pageIds = []
    for (var pi = 0; pi < pages.length; pi++) {
      pageIds.push(String(pages[pi].id))
    }
    var targetSeen = pageIds.indexOf(targetPageId) !== -1

    // ---- GET /me/permissions -------------------------------------------------
    var permRes = graphGet('me/permissions')
    var permData = permRes && permRes.json && !permRes.netError ? permRes.json : {}
    var permErrObj = permData.error || {}
    var granted = []
    var permList = permData.data || []
    for (var gj = 0; gj < permList.length; gj++) {
      if (String(permList[gj].status) === 'granted' && permList[gj].permission) {
        granted.push(String(permList[gj].permission))
      }
    }

    var proofSent = !!proofParam(token)
    var auditMsg =
      'Probe de token: GET /me, /me/accounts e /me/permissions feitas COM appsecret_proof' +
      (proofSent ? ' (App Secret do registro do usuário)' : ' (SEM App Secret disponível)') +
      ' | /me/accounts respondeu ' +
      pageIds.length +
      ' Página(s)' +
      (accErrObj && accErrObj.code ? ' com erro code=' + accErrObj.code : '') +
      (meErrObj && meErrObj.code ? ' | /me com erro code=' + meErrObj.code : '')

    logErr(
      'meta_token_probe',
      auditMsg,
      'page_id=' + targetPageId + ' | proof_enviado=' + (proofSent ? 'sim' : 'nao'),
      {
        page_id: targetPageId,
        proof_sent: proofSent,
        me_id: meData.id || null,
        me_error: meErrObj.code || null,
        accounts_http_status: accRes && !accRes.netError ? accRes.statusCode : 0,
        accounts_error: accErrObj || null,
        visible_page_ids: pageIds,
        target_page_visible: targetSeen,
        permissions_error: permErrObj.code || null,
        granted_permissions: granted,
      },
    )

    return e.json(200, {
      success: true,
      proof_sent: proofSent,
      me: {
        id: meData.id || null,
        name: meData.name || null,
        error: meErrObj.code ? { code: meErrObj.code, message: meErrObj.message } : null,
      },
      accounts: {
        http_status: accRes && !accRes.netError ? accRes.statusCode : 0,
        count: pageIds.length,
        page_ids: pageIds,
        target_page_visible: targetSeen,
        error: accErrObj.code
          ? { code: accErrObj.code, message: accErrObj.message }
          : accRes && accRes.netError
            ? { net_error: accRes.netError }
            : null,
      },
      permissions: {
        granted: granted,
        error: permErrObj.code ? { code: permErrObj.code, message: permErrObj.message } : null,
      },
    })
  },
  $apis.requireAuth(),
)

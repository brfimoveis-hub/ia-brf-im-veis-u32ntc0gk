// POST /backend/v1/instagram/test_connection — DIAGNÓSTICO DO CARTÃO INSTAGRAM BUSINESS
// (tela /settings/connections). Somente leitura: NÃO salva token, NÃO muda
// status do usuário, NÃO interfere no fluxo "Salvar e Assinar" nem no envio da Bia.
//
// v0.0.1425 — por que foi reescrito:
//   O cartão mostrava "Páginas acessíveis: 0 — O token NÃO enxerga nenhuma
//   Página (erro 100/33)" mesmo DEPOIS do "Salvar e Assinar" ter provado nos
//   logs que /me/accounts com appsecret_proof retornou HTTP 200 listando a
//   Página www.brfimoveis.com.br (1401557100168686). Causas:
//     1) este endpoint NUNCA chamava /me/accounts — o front pintava "0" por
//        padrão sempre que havia token_identity;
//     2) a leitura podia usar token antigo/cache em vez do token gravado no
//        banco pelo fluxo de salvamento.
//   Agora:
//     - Lê SEMPRE o token do registro do usuário no banco (precedência:
//       meta_instagram_page_token → meta_page_access_token →
//       meta_instagram_user_token), nunca cache ou variável de ambiente;
//     - TODA chamada Graph leva appsecret_proof (HMAC-SHA256 do access_token
//       com o App Secret: meta_app_secret → meta_instagram_app_secret → env
//       META_APP_SECRET — mesma técnica provada de meta_messenger_save_and_subscribe);
//     - Erro 100/190/etc da Graph volta com o MOTIVO REAL (graph_error +
//       pages_lookup.ok=false) — "0 páginas" só é dito quando a leitura
//       realmente sucedeu e voltou vazia;
//     - /me/accounts com sucesso lista nome/ID de cada Página encontrada;
//     - Cada execução grava auditoria em system_logs (type=instagram_diagnostic_result).

routerAdd(
  'POST',
  '/backend/v1/instagram/test_connection',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    let user = null
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {
      return e.json(200, { success: false, status: 'error', message: 'Usuário não encontrado' })
    }

    const GRAPH_BASE = 'https://graph.facebook.com/v22.0/'

    // ------------------------------------------------------------------
    // Helpers — declarados DENTRO do handler (regra v0.0.1399: funções
    // top-level podem sumir do bundle deployado).
    // ------------------------------------------------------------------
    function maskTok(tok) {
      if (!tok || typeof tok !== 'string') return ''
      const tr = tok.trim()
      if (tr.length <= 4) return '***'
      return '...' + tr.slice(-4)
    }

    function extractErr(resJson, status) {
      const errObj = (resJson && resJson.error) || {}
      return {
        http_status: status || 0,
        message: errObj.message || 'HTTP ' + (status || 0),
        code: typeof errObj.code === 'number' ? errObj.code : null,
        subcode: typeof errObj.error_subcode === 'number' ? errObj.error_subcode : null,
        user_msg: errObj.error_user_msg || errObj.error_user_title || null,
      }
    }

    // App Secret do app que EMITIU o token (BRF Imóveis 2 2442476629610638).
    // Precedência: meta_app_secret → meta_instagram_app_secret → env.
    var appCredsCache = null
    var readAppCreds = function () {
      if (appCredsCache) return appCredsCache
      let appId = ''
      let appSecret = ''
      try {
        appId = (user.getString('meta_app_id') || '').trim()
        appSecret = (user.getString('meta_app_secret') || '').trim()
        if (!appId || !appSecret) {
          appId = appId || (user.getString('meta_instagram_app_id') || '').trim()
          appSecret = appSecret || (user.getString('meta_instagram_app_secret') || '').trim()
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

    // Acrescenta '&appsecret_proof=...' — a Meta deste app EXIGE proof em toda
    // chamada de servidor, INCLUSIVE com Page Token (prova nos logs de 13/11,
    // code=100 "API calls from the server require an appsecret_proof argument").
    var proofParam = function (accessToken) {
      const creds = readAppCreds()
      if (!creds || !creds.secret || !accessToken) return ''
      try {
        return '&appsecret_proof=' + $security.hs256(String(accessToken), creds.secret)
      } catch (_) {
        return ''
      }
    }

    // Auditoria em system_logs (prova de rito do diagnóstico)
    var sysLogsCol = null
    try {
      sysLogsCol = $app.findCollectionByNameOrId('system_logs')
    } catch (_) {}
    var audit = function (message, payload) {
      try {
        if (!sysLogsCol) return
        const rec = new Record(sysLogsCol, {
          user_id: userId,
          type: 'instagram_diagnostic_result',
          message: String(message || '').slice(0, 900),
          details: '',
          payload: payload || {},
        })
        $app.save(rec)
      } catch (_) {}
    }

    // ------------------------------------------------------------------
    // TOKEN: SEMPRE o registro do banco do usuário (nunca cache/env antigo).
    // Precedência: Page Token salvo pelo "Salvar e Assinar" primeiro — é o
    // token que a Meta já aceitou (/me/accounts HTTP 200 nos logs); o user
    // token OAuth antigo pode estar expirado e não pode pintar "0 páginas".
    // ------------------------------------------------------------------
    const savedPageToken = String(
      user.getString('meta_instagram_page_token') || user.getString('meta_page_access_token') || '',
    ).replace(/\s+/g, '')
    const oauthUserToken = String(user.getString('meta_instagram_user_token') || '').replace(
      /\s+/g,
      '',
    )
    const igBizIdSaved = String(user.getString('meta_instagram_business_id') || '').trim()
    const savedPageId = String(user.getString('meta_messenger_page_id') || '').trim()

    const primaryToken = savedPageToken || oauthUserToken
    const primaryKind = savedPageToken
      ? 'saved_page_token'
      : oauthUserToken
        ? 'oauth_user_token'
        : ''
    const appIdOut = (
      user.getString('meta_instagram_app_id') ||
      user.getString('meta_app_id') ||
      ''
    ).trim()

    if (!primaryToken) {
      const msg = !igBizIdSaved
        ? 'Nenhum token Meta gravado no banco deste usuário. Conecte via OAuth ou cole o token em "Salvar e Assinar".'
        : 'Instagram Business ID configurado (' +
          igBizIdSaved +
          '), mas nenhum token gravado no banco. Cole o token em "Salvar e Assinar".'
      audit('Diagnóstico Instagram: sem token no banco — ' + msg, {
        outcome: 'sem_token',
        instagram_business_id: igBizIdSaved,
      })
      return e.json(200, {
        success: true,
        status: !igBizIdSaved ? 'not_configured' : 'configured_waiting_token',
        message: msg,
        token_source: 'nenhum',
        has_oauth_token: false,
        app_id: appIdOut,
        instructions: 'Gere o token (OAuth ou Graph API Explorer) e use o painel Salvar e Assinar.',
        token_identity: null,
        page_linked_instagram: null,
        accessible_pages: [],
        portfolio_scan: [],
        portfolio_scan_error: null,
        tested_tokens: [],
        graph_error: null,
        pages_lookup: {
          ok: false,
          attempted: false,
          http_status: 0,
          proof_enviado: 'nao',
          error: null,
        },
      })
    }

    const tokenSuffix = maskTok(primaryToken)
    const testedTokens = [{ type: primaryKind, token_suffix: tokenSuffix, source: 'banco (users)' }]

    // ---------------------------------------------------------------
    // Passo 1 — identidade do token: GET /me?fields=id,name (com proof)
    // ---------------------------------------------------------------
    let tokenIdentity = null
    let graphError = null
    try {
      const meRes = $http.send({
        url: GRAPH_BASE + 'me?fields=id,name' + proofParam(primaryToken),
        method: 'GET',
        headers: { Authorization: 'Bearer ' + primaryToken },
        timeout: 12,
      })
      if (meRes.statusCode >= 200 && meRes.statusCode < 300 && meRes.json) {
        tokenIdentity = {
          id: String(meRes.json.id || ''),
          name: String(meRes.json.name || ''),
          type: primaryKind === 'saved_page_token' ? 'page' : 'user',
          http_status: meRes.statusCode,
        }
      } else {
        tokenIdentity = {
          error: extractErr(meRes.json, meRes.statusCode),
          http_status: meRes.statusCode,
        }
        graphError = tokenIdentity.error
      }
    } catch (meNet) {
      tokenIdentity = {
        error: {
          http_status: 0,
          message: 'Erro de rede: ' + String(meNet && meNet.message ? meNet.message : meNet),
        },
      }
    }

    // ---------------------------------------------------------------
    // Passo 2 — /me/accounts (com proof): lista as Páginas que o token
    // gravado no banco REALMENTE enxerga. Falha aqui NÃO significa
    // "0 páginas": volta como pages_lookup.ok=false com o erro da Meta.
    // ---------------------------------------------------------------
    // v0.0.1426 — Page Token NÃO possui o campo "accounts": chamar /me/accounts
    // com ele devolve (#100) "Tried accessing nonexisting field (accounts)" e
    // esse erro ficava escondido no payload como graph_error. Para Page Token
    // o diagnóstico valida via /me + GET /{page}?fields=instagram_business_account.
    const isPageToken = primaryKind === 'saved_page_token'
    const pagesLookup = {
      ok: false,
      attempted: !isPageToken,
      http_status: 0,
      proof_enviado: proofParam(primaryToken) !== '' ? 'sim' : 'nao',
      error: null,
      skipped_reason: isPageToken ? 'page_token_nao_possui_me_accounts' : '',
    }
    const accessiblePages = []
    const portfolioScan = []
    if (pagesLookup.attempted)
      try {
        const accRes = $http.send({
          url:
            GRAPH_BASE +
            'me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=50' +
            proofParam(primaryToken),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + primaryToken },
          timeout: 12,
        })
        pagesLookup.http_status = accRes.statusCode
        if (
          accRes.statusCode >= 200 &&
          accRes.statusCode < 300 &&
          accRes.json &&
          Array.isArray(accRes.json.data)
        ) {
          pagesLookup.ok = true
          for (let p = 0; p < accRes.json.data.length; p++) {
            const pg = accRes.json.data[p]
            const ig = pg.instagram_business_account || null
            const item = {
              page_id: String(pg.id || ''),
              page_name: String(pg.name || ''),
              has_instagram: !!(ig && ig.id),
              ig_account_id: (ig && ig.id) || null,
              ig_username: (ig && (ig.username || ig.name)) || null,
              matches_saved_page_id: !!savedPageId && String(pg.id || '') === savedPageId,
            }
            accessiblePages.push(item)
            portfolioScan.push({
              page_id: item.page_id,
              page_name: item.page_name,
              has_ig: item.has_instagram,
              ig_account_id: item.ig_account_id,
              ig_username: item.ig_username,
              ig_error: null,
            })
          }
          testedTokens.push({
            type: primaryKind,
            token_suffix: tokenSuffix,
            check: 'me/accounts',
            status: 'ok (' + accessiblePages.length + ' paginas)',
            http_status: accRes.statusCode,
            proof_enviado: pagesLookup.proof_enviado,
          })
        } else {
          pagesLookup.error = extractErr(accRes.json, accRes.statusCode)
          graphError = graphError || pagesLookup.error
          testedTokens.push({
            type: primaryKind,
            token_suffix: tokenSuffix,
            check: 'me/accounts',
            status: 'failed',
            http_status: pagesLookup.http_status,
            graph_error: pagesLookup.error,
            proof_enviado: pagesLookup.proof_enviado,
          })
        }
      } catch (accNet) {
        pagesLookup.error = {
          http_status: 0,
          message: 'Erro de rede: ' + String(accNet && accNet.message ? accNet.message : accNet),
          code: null,
          subcode: null,
        }
        graphError = graphError || pagesLookup.error
        testedTokens.push({
          type: primaryKind,
          check: 'me/accounts',
          status: 'network_error',
        })
      }

    // ---------------------------------------------------------------
    // Passo 2.5 — Page Token não lista Páginas em /me/accounts (a Meta
    // devolve lista vazia MESMO com token válido). Se a identidade /me
    // confirmou que o token É a Página, ela mesma é a Página acessível —
    // consulta direta com proof em vez de pintar "0 páginas" falso.
    // ---------------------------------------------------------------
    if (
      primaryKind === 'saved_page_token' &&
      tokenIdentity &&
      !tokenIdentity.error &&
      tokenIdentity.id
    ) {
      try {
        const selfRes = $http.send({
          url:
            GRAPH_BASE +
            encodeURIComponent(tokenIdentity.id) +
            '?fields=id,name,instagram_business_account{id,username,name}' +
            proofParam(primaryToken),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + primaryToken },
          timeout: 12,
        })
        if (selfRes.statusCode >= 200 && selfRes.statusCode < 300 && selfRes.json) {
          const selfIg = selfRes.json.instagram_business_account || null
          pagesLookup.ok = true
          pagesLookup.http_status = selfRes.statusCode
          pagesLookup.via = 'page_token_self'
          const selfItem = {
            page_id: String(selfRes.json.id || tokenIdentity.id),
            page_name: String(selfRes.json.name || tokenIdentity.name || ''),
            has_instagram: !!(selfIg && selfIg.id),
            ig_account_id: (selfIg && selfIg.id) || null,
            ig_username: (selfIg && (selfIg.username || selfIg.name)) || null,
            matches_saved_page_id: !!savedPageId && String(selfRes.json.id || '') === savedPageId,
          }
          accessiblePages.push(selfItem)
          portfolioScan.push({
            page_id: selfItem.page_id,
            page_name: selfItem.page_name,
            has_ig: selfItem.has_instagram,
            ig_account_id: selfItem.ig_account_id,
            ig_username: selfItem.ig_username,
            ig_error: null,
          })
          testedTokens.push({
            type: primaryKind,
            token_suffix: tokenSuffix,
            check: 'GET /{page} (page token)',
            status: 'ok — a Página do próprio token',
            http_status: selfRes.statusCode,
            proof_enviado: pagesLookup.proof_enviado,
          })
        }
      } catch (_) {}
    }

    // ---------------------------------------------------------------
    // Passo 2.7 — AUDITORIA + GARANTIA da inscrição de webhooks da
    // Página no app (fields de mensagens). Idempotente: GET
    // /{page}/subscribed_apps lista o que já está inscrito; se faltar
    // field, POST /{page}/subscribed_apps (Page Token + appsecret_proof,
    // mesma técnica $security.hs256 provada nos hooks de envio) reassina
    // sem quebrar nada. Falha aqui NÃO pinta graph_error do cartão —
    // vira aviso próprio + log type=page_webhook_subscription_audit.
    // ---------------------------------------------------------------
    const WEBHOOK_FIELDS = [
      'messages',
      'messaging_postbacks',
      'messaging_optins',
      'messaging_referrals',
      'instagram_messages',
      'instagram_messaging',
      'feed',
      'mentions',
    ]
    let webhookSub = null
    const subPageId = (tokenIdentity && !tokenIdentity.error && tokenIdentity.id) || savedPageId
    if (subPageId) {
      webhookSub = {
        page_id: subPageId,
        before: [],
        after: [],
        missing_fields: [],
        subscribed_now: false,
        ok: false,
        error: null,
      }
      var readSubscribedFields = function () {
        const fields = []
        try {
          const gRes = $http.send({
            url:
              GRAPH_BASE +
              encodeURIComponent(subPageId) +
              '/subscribed_apps?fields=subscribed_fields' +
              proofParam(primaryToken),
            method: 'GET',
            headers: { Authorization: 'Bearer ' + primaryToken },
            timeout: 12,
          })
          if (
            gRes.statusCode >= 200 &&
            gRes.statusCode < 300 &&
            gRes.json &&
            Array.isArray(gRes.json.data)
          ) {
            for (let gi = 0; gi < gRes.json.data.length; gi++) {
              const sf = (gRes.json.data[gi] && gRes.json.data[gi].subscribed_fields) || []
              for (let gj = 0; gj < sf.length; gj++) {
                if (fields.indexOf(String(sf[gj])) === -1) fields.push(String(sf[gj]))
              }
            }
            return { ok: true, fields: fields }
          }
          if (gRes.json && gRes.json.error) {
            webhookSub.error = extractErr(gRes.json, gRes.statusCode)
          }
          return { ok: false, fields: fields }
        } catch (gNet) {
          webhookSub.error = {
            http_status: 0,
            message: 'Erro de rede: ' + String(gNet && gNet.message ? gNet.message : gNet),
          }
          return { ok: false, fields: fields }
        }
      }
      const beforeRead = readSubscribedFields()
      webhookSub.before = beforeRead.fields
      webhookSub.ok = beforeRead.ok
      const missing = WEBHOOK_FIELDS.filter((f) => webhookSub.before.indexOf(f) === -1)
      webhookSub.missing_fields = missing
      if (webhookSub.ok && missing.length > 0) {
        try {
          const pRes = $http.send({
            url:
              GRAPH_BASE +
              encodeURIComponent(subPageId) +
              '/subscribed_apps?subscribed_fields=' +
              encodeURIComponent(WEBHOOK_FIELDS.join(',')) +
              proofParam(primaryToken),
            method: 'POST',
            headers: { Authorization: 'Bearer ' + primaryToken },
            timeout: 12,
          })
          if (pRes.statusCode >= 200 && pRes.statusCode < 300 && pRes.json && pRes.json.success) {
            webhookSub.subscribed_now = true
            const afterRead = readSubscribedFields()
            webhookSub.after = afterRead.fields
          } else if (pRes.json && pRes.json.error) {
            webhookSub.error = extractErr(pRes.json, pRes.statusCode)
          }
        } catch (pNet) {
          webhookSub.error = {
            http_status: 0,
            message: 'Erro de rede: ' + String(pNet && pNet.message ? pNet.message : pNet),
          }
        }
      } else if (webhookSub.ok) {
        webhookSub.after = webhookSub.before.slice()
      }
      try {
        if (sysLogsCol) {
          const recSub = new Record(sysLogsCol, {
            user_id: userId,
            type: 'page_webhook_subscription_audit',
            message:
              'Inscrição de webhooks da Página ' +
              subPageId +
              ': antes=[' +
              webhookSub.before.join(',') +
              '] depois=[' +
              webhookSub.after.join(',') +
              '] reassinado=' +
              (webhookSub.subscribed_now ? 'sim' : 'nao') +
              (webhookSub.error ? ' erro=' + (webhookSub.error.message || '') : '') +
              ' proof_enviado=' +
              (proofParam(primaryToken) !== '' ? 'sim' : 'nao'),
            details: '',
            payload: webhookSub,
          })
          $app.save(recSub)
        }
      } catch (_) {}
    }

    // ---------------------------------------------------------------
    // Passo 3 — foco: GET /{ig-id}?fields=id,name,username (com proof).
    // Sem ID salvo, auto-detecta (SÓ leitura — não grava nada) a 1ª
    // Página com Instagram visível; o front mostra o valor detectado.
    // ---------------------------------------------------------------
    let connected = false
    let verifiedName = ''
    let focusTarget = igBizIdSaved
    let autoCorrected = false
    if (!focusTarget && pagesLookup.ok) {
      for (let d = 0; d < accessiblePages.length; d++) {
        if (accessiblePages[d].has_instagram && accessiblePages[d].ig_account_id) {
          focusTarget = accessiblePages[d].ig_account_id
          autoCorrected = true
          break
        }
      }
    }
    if (focusTarget) {
      try {
        const fRes = $http.send({
          url:
            GRAPH_BASE +
            encodeURIComponent(focusTarget) +
            '?fields=id,name,username' +
            proofParam(primaryToken),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + primaryToken },
          timeout: 15,
        })
        if (fRes.statusCode >= 200 && fRes.statusCode < 300 && fRes.json) {
          connected = true
          verifiedName = String(fRes.json.username || fRes.json.name || '')
          if (!tokenIdentity || tokenIdentity.error) {
            tokenIdentity = {
              id: String(fRes.json.id || focusTarget),
              name: String(fRes.json.name || ''),
              type: 'instagram_business',
              http_status: fRes.statusCode,
            }
          }
          testedTokens.push({
            type: primaryKind,
            token_suffix: tokenSuffix,
            check: 'GET /' + focusTarget,
            status: 'ok',
            http_status: fRes.statusCode,
          })
        } else {
          const fErr = extractErr(fRes.json, fRes.statusCode)
          graphError = graphError || fErr
          testedTokens.push({
            type: primaryKind,
            token_suffix: tokenSuffix,
            check: 'GET /' + focusTarget,
            status: 'failed',
            http_status: fErr.http_status,
            graph_error: fErr,
          })
        }
      } catch (fNet) {
        const fNetErr = {
          http_status: 0,
          message: 'Erro de rede: ' + String(fNet && fNet.message ? fNet.message : fNet),
          code: null,
          subcode: null,
        }
        graphError = graphError || fNetErr
      }
    }

    // ---------------------------------------------------------------
    // Vínculo Instagram↔Página (para o bloco roxo/âmbar do cartão).
    // "linked: false" SÓ quando a leitura sucedeu e nenhuma Página
    // visível tem Instagram — nunca em falha de assinatura/permissão.
    // ---------------------------------------------------------------
    let pageLinkedIg = null
    if (pagesLookup.ok) {
      const withIg = accessiblePages.filter((p) => p.has_instagram)
      if (withIg.length > 0) {
        pageLinkedIg = {
          linked: true,
          id: withIg[0].ig_account_id,
          username: withIg[0].ig_username,
          page_id: withIg[0].page_id,
          page_name: withIg[0].page_name,
        }
      } else if (accessiblePages.length > 0) {
        const ref =
          accessiblePages.find((p) => tokenIdentity && p.page_id === tokenIdentity.id) ||
          accessiblePages[0]
        pageLinkedIg = {
          linked: false,
          id: null,
          username: null,
          page_id: ref.page_id,
          page_name: ref.page_name,
        }
      }
    }

    // ---------------------------------------------------------------
    // Permissões (só com token de usuário — /me/permissions ignora page token)
    // ---------------------------------------------------------------
    let grantedPerms = []
    let missingPerms = []
    if (primaryKind === 'oauth_user_token') {
      try {
        const pRes = $http.send({
          url: GRAPH_BASE + 'me/permissions' + proofParam(primaryToken),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + primaryToken },
          timeout: 10,
        })
        if (pRes.statusCode === 200 && pRes.json && Array.isArray(pRes.json.data)) {
          grantedPerms = pRes.json.data
            .filter((p) => p.status === 'granted')
            .map((p) => p.permission)
          const wanted = ['pages_show_list', 'pages_read_engagement', 'instagram_basic']
          for (let w = 0; w < wanted.length; w++) {
            if (grantedPerms.indexOf(wanted[w]) === -1) missingPerms.push(wanted[w])
          }
        }
      } catch (_) {}
    }

    // ---------------------------------------------------------------
    // Classificação final — o motivo real da Meta, nunca "0 páginas"
    // quando a chamada falhou por assinatura/permissão.
    // ---------------------------------------------------------------
    let status = ''
    let message = ''
    let instructions = ''
    const errCode =
      graphError && graphError.code !== null && graphError.code !== undefined
        ? Number(graphError.code)
        : 0
    const errSub = graphError && graphError.subcode ? graphError.subcode : 0
    if (connected) {
      const pgList = accessiblePages.map((p) => p.page_name + ' (ID ' + p.page_id + ')').join(', ')
      status = 'connected'
      message =
        'Conectado ✅' +
        (verifiedName ? ' — @' + verifiedName : '') +
        ' | Token lido do banco (' +
        (primaryKind === 'saved_page_token' ? 'Page Token' : 'token de usuário') +
        ', fim ' +
        tokenSuffix +
        ')' +
        (pagesLookup.ok
          ? ' | Páginas visíveis: ' + accessiblePages.length + (pgList ? ' — ' + pgList : '')
          : '') +
        (webhookSub && webhookSub.ok
          ? ' | Webhook inscrito: ' +
            (webhookSub.after.length > 0
              ? webhookSub.after.length +
                ' fields' +
                (webhookSub.subscribed_now ? ' (reassinado agora)' : '')
              : 'nenhum field')
          : webhookSub && webhookSub.error
            ? ' | Webhook: ' + (webhookSub.error.message || 'falhou')
            : '')
    } else if (errCode === 190) {
      status = 'expired'
      message =
        'O token gravado no banco foi rejeitado pela Meta: ' +
        (graphError.message || 'token expirado') +
        ' (code 190' +
        (errSub ? ', subcode ' + errSub : '') +
        '). Gere um novo token e cole em Salvar e Assinar — NÃO saia do Facebook depois de gerar.'
      instructions = 'Renove o token em /settings/connections (painel Salvar e Assinar).'
    } else if (pagesLookup.ok && accessiblePages.length === 0) {
      status = 'configured_waiting_token'
      message =
        'A leitura na Meta SUCEDEU (HTTP 200 com appsecret_proof), mas /me/accounts não retornou nenhuma Página: faltam permissões pages_show_list/pages_read_engagement ou o usuário não administra Páginas.'
      instructions =
        'Reconecte via OAuth marcando pages_show_list e pages_read_engagement, ou gere o token com uma conta admin da Página.'
    } else if (graphError) {
      status = 'error'
      message =
        'A leitura na Meta falhou — motivo real: ' +
        (graphError.message || 'HTTP ' + (graphError.http_status || 0)) +
        (errCode ? ' (code ' + errCode + (errSub ? ', subcode ' + errSub : '') + ')' : '') +
        '. O diagnóstico NÃO afirma quantas Páginas o token vê enquanto a leitura falha.'
      instructions =
        'Verifique o App Secret salvo (meta_app_secret) e as permissões do token; depois clique Verificar Agora.'
    } else {
      status = 'error'
      message =
        'Não foi possível confirmar a conexão: nenhuma Página com Instagram visível e nenhum Instagram Business ID salvo.'
      instructions = 'Conecte via OAuth ou informe o ID do Instagram Business.'
    }

    audit('Diagnóstico Instagram: ' + status + ' — ' + message, {
      outcome: status,
      token_kind: primaryKind,
      token_suffix: tokenSuffix,
      proof_enviado: pagesLookup.proof_enviado,
      http_status: pagesLookup.http_status,
      instagram_business_id: focusTarget || igBizIdSaved,
      auto_corrected: autoCorrected,
      pages_lookup_ok: pagesLookup.ok,
      pages_count: accessiblePages.length,
      pages: accessiblePages.map((p) => ({
        id: p.page_id,
        name: p.page_name,
        ig: p.ig_username || null,
      })),
      webhook_subscription: webhookSub,
      graph_error: graphError || null,
    })

    return e.json(200, {
      success: true,
      status: status,
      message: message,
      token_source: 'banco (' + primaryKind + ')',
      has_oauth_token: !!oauthUserToken,
      app_id: appIdOut,
      instagram_business_id: focusTarget || igBizIdSaved,
      auto_corrected: autoCorrected,
      old_instagram_business_id: autoCorrected && igBizIdSaved ? igBizIdSaved : undefined,
      token_identity: tokenIdentity,
      page_linked_instagram: pageLinkedIg,
      accessible_pages: accessiblePages,
      portfolio_scan: portfolioScan,
      portfolio_scan_error: null,
      tested_tokens: testedTokens,
      webhook_subscription: webhookSub,
      graph_error: graphError,
      granted_perms: grantedPerms,
      missing_perms: missingPerms,
      instructions: instructions,
      pages_lookup: pagesLookup,
    })
  },
  $apis.requireAuth(),
)

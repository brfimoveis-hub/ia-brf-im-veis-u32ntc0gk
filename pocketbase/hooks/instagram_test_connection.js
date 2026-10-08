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
      return e.badRequestError('Usuário não encontrado')
    }

    let igBizId = (user.getString('meta_instagram_business_id') || '').trim()
    const oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    const pageTokenCandidate = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()

    let igToken = oauthUserToken || pageTokenCandidate
    let tokenSource = oauthUserToken
      ? 'oauth_user_token (salvo via OAuth)'
      : pageTokenCandidate
        ? 'page_token (salvo em meta_instagram_page_token/meta_page_access_token)'
        : 'nenhum'

    const igAppId = (user.getString('meta_instagram_app_id') || '2442476629610638').trim()
    const sysUserToken = (user.getString('meta_whatsapp_access_token') || '').trim()
    const capiToken = (user.getString('meta_capi_token') || '').trim()

    if (!igBizId && !igToken) {
      return e.json(200, {
        success: false,
        status: 'not_configured',
        message: 'Instagram não configurado no CRM (nenhum token ou ID encontrado).',
        instructions: 'Conecte via OAuth ou informe o Page Access Token nas configurações.',
      })
    }

    function maskToken(tok) {
      if (!tok || typeof tok !== 'string') return ''
      var trimmed = tok.trim()
      if (trimmed.length <= 4) return '***'
      return '...' + trimmed.slice(-4)
    }

    function extractGraphError(resJson, httpStatus) {
      var errObj = (resJson && resJson.error) || {}
      return {
        http_status: httpStatus || 0,
        message: errObj.message || (resJson && resJson.error_message) || 'HTTP ' + httpStatus,
        code: typeof errObj.code === 'number' ? errObj.code : errObj.code || null,
        subcode:
          typeof errObj.error_subcode === 'number'
            ? errObj.error_subcode
            : errObj.error_subcode || null,
        user_msg: errObj.error_user_msg || errObj.error_user_title || null,
        type: errObj.type || null,
      }
    }

    var testedTokens = []
    var savedTokenGraphError = null

    const tokensToTry = []
    if (oauthUserToken) {
      tokensToTry.push({ token: oauthUserToken, type: 'oauth_user' })
    }
    if (
      pageTokenCandidate &&
      pageTokenCandidate !== oauthUserToken &&
      pageTokenCandidate !== sysUserToken &&
      pageTokenCandidate !== capiToken
    ) {
      tokensToTry.push({ token: pageTokenCandidate, type: 'page_token' })
    }
    if (!oauthUserToken) {
      if (sysUserToken) {
        tokensToTry.push({ token: sysUserToken, type: 'system_user' })
      }
      if (capiToken && capiToken !== sysUserToken) {
        tokensToTry.push({ token: capiToken, type: 'capi' })
      }
    }

    // Alvo oficial de verificação: SEMPRE @brf_imoveis_
    const TARGET_CRM_USERNAME = 'brf_imoveis_'
    const crmIgUsername = TARGET_CRM_USERNAME

    // Helper para tentar resolver o username de uma conta IG a partir de vários tokens candidatos
    // Tenta primeiro GET /{ig_account_id}?fields=username com page token, depois user token etc.
    // Loga a resposta bruta da Graph API e erros com prefixo [INSTAGRAM_TEST]
    function resolveInstagramAccountDetails(igId, tokenList, pageContext) {
      if (!igId) return { id: igId, username: null, name: null, last_error: null }
      var candidates = tokenList || []
      var lastErr = null

      for (var k = 0; k < candidates.length; k++) {
        var item = candidates[k]
        var tok = typeof item === 'object' && item !== null ? item.token : item
        var tokType = typeof item === 'object' && item !== null ? item.type : 'token_' + k
        if (!tok) continue
        var tokSuffix = maskToken(tok)

        // Tentativa A: fields=username,name
        try {
          var directUrl =
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(igId) +
            '?fields=username,name,profile_picture_url&access_token=' +
            encodeURIComponent(tok)

          var res = $http.send({
            url: directUrl,
            method: 'GET',
            timeout: 10,
          })

          var rawBodyA = ''
          try {
            rawBodyA = typeof res.body === 'string' ? res.body : JSON.stringify(res.json || {})
          } catch (_) {}

          console.log(
            '[INSTAGRAM_TEST] direct IG node GET /' +
              igId +
              ' (' +
              tokType +
              ' ' +
              tokSuffix +
              (pageContext ? ' | ' + pageContext : '') +
              ') status=' +
              res.statusCode +
              ' body=' +
              rawBodyA,
          )

          if (res.statusCode >= 200 && res.statusCode < 300 && res.json) {
            var uName = (res.json.username || '').trim()
            var dName = (res.json.name || '').trim()
            if (uName) {
              return {
                id: String(res.json.id || igId).trim(),
                username: uName,
                name: dName || uName,
                last_error: null,
              }
            }
            if (dName && !uName) {
              // Algumas contas retornam apenas name (ou o name é o handle)
              console.log(
                '[INSTAGRAM_TEST] direct IG node retornou name="' +
                  dName +
                  '" sem campo username explícito',
              )
            }
          } else {
            var gErrA = extractGraphError(res.json, res.statusCode)
            lastErr = gErrA.message + ' (code ' + gErrA.code + ')'
            console.log(
              '[INSTAGRAM_TEST] direct IG node falhou: HTTP ' +
                res.statusCode +
                ' code=' +
                gErrA.code +
                ' subcode=' +
                gErrA.subcode +
                ' msg=' +
                gErrA.message,
            )
          }
        } catch (netErrA) {
          lastErr = String(netErrA && netErrA.message ? netErrA.message : netErrA)
          console.log(
            '[INSTAGRAM_TEST] direct IG node erro de rede (' +
              tokType +
              ' ' +
              tokSuffix +
              '): ' +
              lastErr,
          )
        }

        // Tentativa B: fields=username exclusivamente (às vezes a Graph API rejeita fields compostos)
        try {
          var simpleUrl =
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(igId) +
            '?fields=username&access_token=' +
            encodeURIComponent(tok)

          var sRes = $http.send({
            url: simpleUrl,
            method: 'GET',
            timeout: 8,
          })

          var rawBodyB = ''
          try {
            rawBodyB = typeof sRes.body === 'string' ? sRes.body : JSON.stringify(sRes.json || {})
          } catch (_) {}

          if (sRes.statusCode >= 200 && sRes.statusCode < 300 && sRes.json && sRes.json.username) {
            var sUser = String(sRes.json.username).trim()
            if (sUser) {
              console.log(
                '[INSTAGRAM_TEST] direct IG node simples (fields=username) RESOLVEU: @' +
                  sUser +
                  ' com ' +
                  tokType,
              )
              return {
                id: String(sRes.json.id || igId).trim(),
                username: sUser,
                name: sUser,
                last_error: null,
              }
            }
          } else if (sRes.statusCode !== 200) {
            console.log(
              '[INSTAGRAM_TEST] direct IG node simples fields=username falhou: HTTP ' +
                sRes.statusCode +
                ' body=' +
                rawBodyB,
            )
          }
        } catch (_) {}
      }

      return { id: igId, username: null, name: null, last_error: lastErr }
    }

    // Helper para resolver o IG de uma Página via GET /{page_id}?fields=instagram_business_account{id,username}
    // Faz a chamada prioritariamente com o PAGE ACCESS TOKEN da página (não user token).
    function resolvePageInstagram(pageId, pageAccessToken, fallbackToken, pageName) {
      var tokens = []
      if (pageAccessToken) {
        tokens.push({ token: pageAccessToken, type: 'page_access_token' })
      }
      if (fallbackToken && fallbackToken !== pageAccessToken) {
        tokens.push({ token: fallbackToken, type: 'fallback_token' })
      }
      if (
        oauthUserToken &&
        oauthUserToken !== pageAccessToken &&
        oauthUserToken !== fallbackToken
      ) {
        tokens.push({ token: oauthUserToken, type: 'oauth_user_token' })
      }

      var lastErr = null

      for (var tIdx = 0; tIdx < tokens.length; tIdx++) {
        var tItem = tokens[tIdx]
        var actToken = tItem.token
        var actType = tItem.type
        var actSuffix = maskToken(actToken)

        try {
          var pUrl =
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(pageId) +
            '?fields=instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}&access_token=' +
            encodeURIComponent(actToken)

          var pRes = $http.send({
            url: pUrl,
            method: 'GET',
            timeout: 10,
          })

          var rawPageBody = ''
          try {
            rawPageBody =
              typeof pRes.body === 'string' ? pRes.body : JSON.stringify(pRes.json || {})
          } catch (_) {}

          console.log(
            '[INSTAGRAM_TEST] resolvePageInstagram page_id=' +
              pageId +
              ' "' +
              (pageName || '') +
              '" (' +
              actType +
              ' ' +
              actSuffix +
              ') status=' +
              pRes.statusCode +
              ' body=' +
              rawPageBody,
          )

          if (pRes.statusCode >= 200 && pRes.statusCode < 300 && pRes.json) {
            var igObj =
              pRes.json.instagram_business_account || pRes.json.connected_instagram_account || null
            if (
              !igObj &&
              pRes.json.page_backed_instagram_accounts &&
              pRes.json.page_backed_instagram_accounts.data &&
              pRes.json.page_backed_instagram_accounts.data.length > 0
            ) {
              var pb0 = pRes.json.page_backed_instagram_accounts.data[0]
              if (pb0 && pb0.id) {
                igObj = { id: pb0.id, username: pb0.username || '' }
              }
            }

            if (igObj && igObj.id) {
              var retId = String(igObj.id).trim()
              var retUser = (igObj.username || '').trim()

              // Se não trouxe username direto na página, tenta resolver com GET /{ig_account_id}?fields=username
              // usando page token e também user token
              var directErr = null
              if (!retUser) {
                var tokenCandidates = []
                if (pageAccessToken) {
                  tokenCandidates.push({ token: pageAccessToken, type: 'page_token' })
                }
                if (oauthUserToken && oauthUserToken !== pageAccessToken) {
                  tokenCandidates.push({ token: oauthUserToken, type: 'oauth_user_token' })
                }
                if (
                  fallbackToken &&
                  fallbackToken !== pageAccessToken &&
                  fallbackToken !== oauthUserToken
                ) {
                  tokenCandidates.push({ token: fallbackToken, type: 'fallback_token' })
                }

                var igResolved = resolveInstagramAccountDetails(
                  retId,
                  tokenCandidates,
                  'page=' + (pageName || pageId),
                )
                if (igResolved.username) {
                  retUser = igResolved.username
                } else if (igResolved.last_error) {
                  directErr = igResolved.last_error
                }
              }

              return {
                id: retId,
                username: retUser || null,
                name: igObj.name || retUser || null,
                error: directErr,
              }
            }
          } else {
            var pErr = extractGraphError(pRes.json, pRes.statusCode)
            lastErr = pErr.message + ' (code ' + pErr.code + ')'
            console.log(
              '[INSTAGRAM_TEST] resolvePageInstagram falhou: HTTP ' +
                pRes.statusCode +
                ' code=' +
                pErr.code +
                ' msg=' +
                pErr.message,
            )
          }
        } catch (netPErr) {
          lastErr = String(netPErr && netPErr.message ? netPErr.message : netPErr)
          console.log(
            '[INSTAGRAM_TEST] resolvePageInstagram erro de rede page_id=' + pageId + ': ' + lastErr,
          )
        }
      }

      return null
    }

    // =========================================================================
    // PASSO 3 HELPER: VARREDURA DO PORTFÓLIO
    // Consulta /me/accounts com os tokens disponíveis (priorizando oauth_user)
    // =========================================================================
    function runPortfolioScan() {
      var scanResult = []
      var lastScanError = null
      var seenPageIds = {}

      if (tokensToTry.length === 0) {
        return {
          portfolio_scan: [],
          portfolio_scan_error: 'Nenhum token disponível para varredura do portfólio.',
        }
      }

      for (var s = 0; s < tokensToTry.length; s++) {
        var scanCand = tokensToTry[s]
        var scanToken = scanCand.token
        var scanType = scanCand.type
        var scanSuffix = maskToken(scanToken)

        try {
          var scanUrl =
            'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100&access_token=' +
            encodeURIComponent(scanToken)

          var scanRes = $http.send({
            url: scanUrl,
            method: 'GET',
            timeout: 15,
          })

          if (
            scanRes.statusCode >= 200 &&
            scanRes.statusCode < 300 &&
            scanRes.json &&
            Array.isArray(scanRes.json.data)
          ) {
            var pagesData = scanRes.json.data
            console.log(
              '[INSTAGRAM_TEST] passo 3 varredura (' +
                scanType +
                ' ' +
                scanSuffix +
                '): ' +
                pagesData.length +
                ' páginas encontradas',
            )

            for (var pi = 0; pi < pagesData.length; pi++) {
              var pItem = pagesData[pi]
              var pId = String(pItem.id || '').trim()
              if (!pId || seenPageIds[pId]) continue
              seenPageIds[pId] = true

              var pName = String(pItem.name || '').trim()
              var pTok = pItem.access_token || ''
              var igAcc = pItem.instagram_business_account || null

              var igId = igAcc && igAcc.id ? String(igAcc.id).trim() : null
              var igUser =
                igAcc && (igAcc.username || igAcc.name)
                  ? String(igAcc.username || igAcc.name).trim()
                  : null

              var pageIgError = null
              // Se não veio instagram_business_account ou faltou username,
              // consulta /{page_id}?fields=instagram_business_account{id,username} usando page token
              if (!igId || !igUser) {
                var resolved = resolvePageInstagram(pId, pTok, scanToken, pName)
                if (resolved) {
                  igId = resolved.id
                  if (resolved.username) igUser = resolved.username
                  if (resolved.error) pageIgError = resolved.error
                }
              }

              // Se mesmo assim tem igId mas não tem igUser, tenta no próprio nó do IG
              if (igId && !igUser) {
                var directCandidates = []
                if (pTok) directCandidates.push({ token: pTok, type: 'page_token' })
                if (scanToken && scanToken !== pTok)
                  directCandidates.push({ token: scanToken, type: 'scan_token' })
                if (oauthUserToken && oauthUserToken !== pTok && oauthUserToken !== scanToken) {
                  directCandidates.push({ token: oauthUserToken, type: 'oauth_user_token' })
                }
                var directIg = resolveInstagramAccountDetails(
                  igId,
                  directCandidates,
                  'scan page="' + pName + '"',
                )
                if (directIg && directIg.username) {
                  igUser = directIg.username
                  pageIgError = null
                } else if (directIg && directIg.last_error) {
                  pageIgError = directIg.last_error
                }
              }

              var hasIg = !!igId
              var isTargetUser = false
              if (igUser) {
                var cleanFound = igUser.toLowerCase().replace(/^@/, '').trim()
                if (cleanFound === TARGET_CRM_USERNAME) {
                  isTargetUser = true
                }
              }

              console.log(
                '[INSTAGRAM_TEST] passo 3 varredura página [' +
                  pi +
                  ']: page_id=' +
                  pId +
                  ' page_name="' +
                  pName +
                  '" ig_account_id=' +
                  (igId || 'nenhuma') +
                  ' ig_username=' +
                  (igUser ? '@' + igUser : 'nenhuma') +
                  (pageIgError ? ' ig_error="' + pageIgError + '"' : '') +
                  (isTargetUser ? ' [MATCH USUÁRIO ALVO @' + TARGET_CRM_USERNAME + '!]' : ''),
              )

              scanResult.push({
                page_id: pId,
                page_name: pName,
                page_token: pTok,
                ig_account_id: igId,
                ig_username: igUser,
                ig_error: pageIgError,
                has_ig: hasIg,
              })
            }

            // Grava auditoria em system_logs para o resultado desta varredura
            try {
              var logsCol = $app.findCollectionByNameOrId('system_logs')
              if (logsCol) {
                var logRecord = new Record(logsCol, {
                  type: 'instagram_portfolio_scan',
                  message:
                    'Varredura do portfólio Meta executada (' +
                    scanResult.length +
                    ' páginas analisadas)',
                  payload: {
                    user_id: user.id,
                    target_username: TARGET_CRM_USERNAME,
                    pages: scanResult.map(function (p) {
                      return {
                        page_id: p.page_id,
                        page_name: p.page_name,
                        ig_id: p.ig_account_id,
                        ig_username: p.ig_username,
                        has_ig: p.has_ig,
                      }
                    }),
                    timestamp: new Date().toISOString(),
                  },
                  details: scanResult
                    .map(function (p) {
                      return (
                        p.page_name +
                        ' (page_id: ' +
                        p.page_id +
                        ') -> IG: ' +
                        (p.ig_username ? '@' + p.ig_username : 'null') +
                        ' [id: ' +
                        (p.ig_account_id || 'null') +
                        ']'
                      )
                    })
                    .join(' | '),
                  user_id: user.id,
                })
                $app.saveNoValidate(logRecord)
              }
            } catch (scanLogErr) {
              console.log(
                '[INSTAGRAM_TEST] Erro ao registrar log da varredura: ' + String(scanLogErr),
              )
            }

            // REGRA: Se a varredura encontrar a Página cujo IG tem username = brf_imoveis_:
            // Persistir AUTOMATICAMENTE:
            // meta_instagram_business_id = ID do IG encontrado
            // meta_instagram_page_token / meta_page_access_token = page token da Página
            // instagram_username = "brf_imoveis_"
            var matchedTargetPage = scanResult.find(function (p) {
              if (!p.ig_username) return false
              var u = p.ig_username.toLowerCase().replace(/^@/, '').trim()
              return u === TARGET_CRM_USERNAME
            })

            if (matchedTargetPage && matchedTargetPage.ig_account_id) {
              var targetId = matchedTargetPage.ig_account_id
              var targetTok = matchedTargetPage.page_token || ''
              try {
                user.set('meta_instagram_business_id', targetId)
                user.set('instagram_username', TARGET_CRM_USERNAME)
                if (targetTok) {
                  user.set('meta_instagram_page_token', targetTok)
                  user.set('meta_page_access_token', targetTok)
                }
                $app.saveNoValidate(user)
                igAutoCorrected = true
                currentIgBizId = targetId
                console.log(
                  '[INSTAGRAM_TEST] ✅ Página oficial vinculada ao @' +
                    TARGET_CRM_USERNAME +
                    ' encontrada e salva no CRM! IG ID=' +
                    targetId +
                    ' Página="' +
                    matchedTargetPage.page_name +
                    '" (' +
                    matchedTargetPage.page_id +
                    ')',
                )
              } catch (saveScanErr) {
                console.log(
                  '[INSTAGRAM_TEST] Erro ao salvar Página alvo no CRM: ' + String(saveScanErr),
                )
              }
            }

            if (pagesData.length > 0) {
              return {
                portfolio_scan: scanResult.map(function (p) {
                  return {
                    page_id: p.page_id,
                    page_name: p.page_name,
                    ig_account_id: p.ig_account_id,
                    ig_username: p.ig_username,
                    ig_error: p.ig_error || null,
                    has_ig: p.has_ig,
                  }
                }),
                portfolio_scan_error: null,
                matched_target: matchedTargetPage || null,
              }
            }
          } else {
            var sErr = extractGraphError(scanRes.json, scanRes.statusCode)
            lastScanError = sErr.message || 'HTTP ' + scanRes.statusCode
            console.log(
              '[INSTAGRAM_TEST] passo 3 varredura (' +
                scanType +
                ' ' +
                scanSuffix +
                ') falhou: HTTP ' +
                sErr.http_status +
                ' code=' +
                (sErr.code !== null ? sErr.code : 'n/a') +
                ' msg=' +
                sErr.message,
            )
          }
        } catch (scanNetErr) {
          var netMsg = String(scanNetErr && scanNetErr.message ? scanNetErr.message : scanNetErr)
          lastScanError = netMsg
          console.log(
            '[INSTAGRAM_TEST] passo 3 varredura erro de rede (' +
              scanType +
              ' ' +
              scanSuffix +
              '): ' +
              netMsg,
          )
        }
      }

      return {
        portfolio_scan: scanResult.map(function (p) {
          return {
            page_id: p.page_id,
            page_name: p.page_name,
            ig_account_id: p.ig_account_id,
            ig_username: p.ig_username,
            ig_error: p.ig_error || null,
            has_ig: p.has_ig,
          }
        }),
        portfolio_scan_error: lastScanError || 'Falha ao consultar páginas do portfólio na Meta.',
        matched_target: null,
      }
    }

    // =========================================================================
    // PASSO 0: ANATOMIA DO TOKEN SALVO
    // Inspeciona quem o token salvo diz ser e quais Páginas/contas IG ele enxerga
    // =========================================================================
    var tokenIdentity = null
    var accessiblePages = []
    var isPageToken = false
    var pageLinkedInstagram = null // { id, username, name, linked: boolean }
    var igAutoCorrected = false
    var oldIgBizId = igBizId
    var currentIgBizId = igBizId

    if (igToken) {
      var tokenSuffix = maskToken(igToken)

      // 0.a) GET /me para inspecionar identidade do token
      try {
        var meRes = $http.send({
          url: 'https://graph.facebook.com/v22.0/me?fields=id,name,type',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + igToken },
          timeout: 12,
        })

        if (meRes.statusCode >= 200 && meRes.statusCode < 300 && meRes.json) {
          tokenIdentity = {
            id: meRes.json.id || '',
            name: meRes.json.name || '',
            type: meRes.json.type || 'user_or_page',
            http_status: meRes.statusCode,
          }
          console.log(
            '[INSTAGRAM_TEST] passo 0 /me (token ' +
              tokenSuffix +
              '): id=' +
              tokenIdentity.id +
              ' name="' +
              tokenIdentity.name +
              '" type=' +
              tokenIdentity.type,
          )
        } else {
          var meFallback = $http.send({
            url: 'https://graph.facebook.com/v22.0/me?fields=id,name',
            method: 'GET',
            headers: { Authorization: 'Bearer ' + igToken },
            timeout: 10,
          })
          if (meFallback.statusCode >= 200 && meFallback.statusCode < 300 && meFallback.json) {
            tokenIdentity = {
              id: meFallback.json.id || '',
              name: meFallback.json.name || '',
              type: 'unknown',
              http_status: meFallback.statusCode,
            }
            console.log(
              '[INSTAGRAM_TEST] passo 0 /me (fallback fields id,name, token ' +
                tokenSuffix +
                '): id=' +
                tokenIdentity.id +
                ' name="' +
                tokenIdentity.name +
                '"',
            )
          } else {
            var meErr = extractGraphError(meRes.json, meRes.statusCode)
            tokenIdentity = {
              error: meErr,
              http_status: meRes.statusCode,
            }
            console.log(
              '[INSTAGRAM_TEST] passo 0 /me falhou (token ' +
                tokenSuffix +
                '): HTTP ' +
                meErr.http_status +
                ' code=' +
                (meErr.code !== null ? meErr.code : 'n/a') +
                ' msg=' +
                meErr.message,
            )
          }
        }
      } catch (meNetErr) {
        var meNetMsg = String(meNetErr && meNetErr.message ? meNetErr.message : meNetErr)
        tokenIdentity = {
          error: {
            http_status: 0,
            message: 'Erro de rede ao inspecionar /me: ' + meNetMsg,
          },
        }
        console.log(
          '[INSTAGRAM_TEST] passo 0 /me erro de rede (token ' + tokenSuffix + '): ' + meNetMsg,
        )
      }

      // 0.b) GET /me/accounts para listar as Páginas do Facebook acessíveis e contas IG vinculadas
      try {
        var accRes = $http.send({
          url: 'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=50',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + igToken },
          timeout: 12,
        })

        if (
          accRes.statusCode >= 200 &&
          accRes.statusCode < 300 &&
          accRes.json &&
          Array.isArray(accRes.json.data)
        ) {
          var rawPages = accRes.json.data
          console.log(
            '[INSTAGRAM_TEST] passo 0 /me/accounts: ' +
              rawPages.length +
              ' páginas acessíveis com token ' +
              tokenSuffix,
          )

          for (var pi = 0; pi < rawPages.length; pi++) {
            var rPg = rawPages[pi]
            var rIg = rPg.instagram_business_account || null
            var rPageTok = rPg.access_token || ''
            var rPageId = rPg.id || ''

            var resolvedIgId = (rIg && rIg.id) || null
            var resolvedIgUser = (rIg && (rIg.username || rIg.name)) || null

            var pageStep0Error = null
            // Se não veio instagram_business_account ou faltou username, consulta diretamente a página com page token
            if (!resolvedIgId || !resolvedIgUser) {
              var rCheck = resolvePageInstagram(rPageId, rPageTok, igToken, rPg.name)
              if (rCheck) {
                resolvedIgId = rCheck.id
                if (rCheck.username) resolvedIgUser = rCheck.username
                if (rCheck.error) pageStep0Error = rCheck.error
              }
            }

            // Se ainda não tem username, tenta no próprio nó do IG
            if (resolvedIgId && !resolvedIgUser) {
              var directStep0Candidates = []
              if (rPageTok) directStep0Candidates.push({ token: rPageTok, type: 'page_token' })
              if (igToken && igToken !== rPageTok)
                directStep0Candidates.push({ token: igToken, type: 'saved_token' })
              if (oauthUserToken && oauthUserToken !== rPageTok && oauthUserToken !== igToken) {
                directStep0Candidates.push({ token: oauthUserToken, type: 'oauth_user_token' })
              }
              var rDirectIg = resolveInstagramAccountDetails(
                resolvedIgId,
                directStep0Candidates,
                'passo0 page="' + (rPg.name || rPageId) + '"',
              )
              if (rDirectIg && rDirectIg.username) {
                resolvedIgUser = rDirectIg.username
                pageStep0Error = null
              } else if (rDirectIg && rDirectIg.last_error) {
                pageStep0Error = rDirectIg.last_error
              }
            }

            var cleanStep0User = (resolvedIgUser || '').toLowerCase().replace(/^@/, '').trim()
            var matchesTargetAccount = !!(
              resolvedIgId &&
              resolvedIgUser &&
              cleanStep0User === TARGET_CRM_USERNAME
            )

            var parsedPage = {
              page_id: rPageId,
              page_name: rPg.name || '',
              has_instagram: !!resolvedIgId,
              ig_account_id: resolvedIgId,
              ig_username: resolvedIgUser,
              ig_error: pageStep0Error,
              matches_target_id: matchesTargetAccount,
            }
            accessiblePages.push(parsedPage)

            console.log(
              '[INSTAGRAM_TEST] passo 0 página [' +
                pi +
                ']: page_id=' +
                parsedPage.page_id +
                ' page_name="' +
                parsedPage.page_name +
                '" ig_account_id=' +
                (parsedPage.ig_account_id || 'NENHUMA') +
                ' ig_username=' +
                (parsedPage.ig_username ? '@' + parsedPage.ig_username : 'NENHUM') +
                (pageStep0Error ? ' ig_error="' + pageStep0Error + '"' : '') +
                (parsedPage.matches_target_id ? ' [MATCH ALVO!]' : ''),
            )

            // Se esta página tiver o @brf_imoveis_, salva
            if (resolvedIgId && resolvedIgUser) {
              var cleanU = resolvedIgUser.toLowerCase().replace(/^@/, '').trim()
              if (cleanU === TARGET_CRM_USERNAME) {
                pageLinkedInstagram = {
                  linked: true,
                  id: resolvedIgId,
                  username: resolvedIgUser,
                  name: resolvedIgUser,
                  page_id: parsedPage.page_id,
                  page_name: parsedPage.page_name,
                }
                if (resolvedIgId !== currentIgBizId) {
                  try {
                    user.set('meta_instagram_business_id', resolvedIgId)
                    user.set('instagram_username', TARGET_CRM_USERNAME)
                    if (rPageTok) {
                      user.set('meta_instagram_page_token', rPageTok)
                      user.set('meta_page_access_token', rPageTok)
                    }
                    $app.saveNoValidate(user)
                    igAutoCorrected = true
                    currentIgBizId = resolvedIgId
                  } catch (_) {}
                }
              }
            }
          }
        } else {
          var accErr = extractGraphError(accRes.json, accRes.statusCode)
          if (
            accErr.message &&
            accErr.message.indexOf('Tried accessing nonexisting field (accounts)') !== -1
          ) {
            isPageToken = true
            console.log(
              '[INSTAGRAM_TEST] passo 0 /me/accounts: token é um Page Token (comportamento esperado)',
            )
          }
        }
      } catch (accNetErr) {
        console.log(
          '[INSTAGRAM_TEST] passo 0 /me/accounts erro de rede: ' +
            String(accNetErr && accNetErr.message ? accNetErr.message : accNetErr),
        )
      }

      // 0.5 Consulta à própria página (se for Page Token)
      var pageIdCandidate = (tokenIdentity && tokenIdentity.id) || ''
      if (pageIdCandidate && !tokenIdentity.error && !pageLinkedInstagram) {
        var pSelf = resolvePageInstagram(pageIdCandidate, igToken, igToken, tokenIdentity.name)
        if (pSelf && pSelf.id) {
          pageLinkedInstagram = {
            linked: true,
            id: pSelf.id,
            username: pSelf.username,
            name: pSelf.name || pSelf.username,
            page_id: pageIdCandidate,
            page_name: tokenIdentity.name || '',
            error: pSelf.error || null,
          }
        }
      }
    }

    // Executa a varredura do portfólio
    var scanResult = runPortfolioScan()

    // Se a varredura encontrou a Página oficial do @brf_imoveis_
    if (scanResult.matched_target) {
      pageLinkedInstagram = {
        linked: true,
        id: scanResult.matched_target.ig_account_id,
        username: scanResult.matched_target.ig_username || TARGET_CRM_USERNAME,
        name: scanResult.matched_target.ig_username || scanResult.matched_target.page_name,
        page_id: scanResult.matched_target.page_id,
        page_name: scanResult.matched_target.page_name,
      }
      currentIgBizId = scanResult.matched_target.ig_account_id
    } else if (
      !pageLinkedInstagram &&
      scanResult.portfolio_scan &&
      scanResult.portfolio_scan.length > 0
    ) {
      // Se não encontrou o alvo @brf_imoveis_, seleciona a página "www.brfimoveis.com.br" ou a primeira
      var brfCandidate =
        scanResult.portfolio_scan.find(function (p) {
          return (p.page_name || '').toLowerCase().indexOf('brf') !== -1
        }) || scanResult.portfolio_scan[0]

      if (brfCandidate && brfCandidate.has_ig && brfCandidate.ig_account_id) {
        pageLinkedInstagram = {
          linked: true,
          id: brfCandidate.ig_account_id,
          username: brfCandidate.ig_username,
          name: brfCandidate.ig_username || brfCandidate.page_name,
          page_id: brfCandidate.page_id,
          page_name: brfCandidate.page_name,
        }
      }
    }

    // Se nenhuma Página possui conta de Instagram vinculada
    var anyPageHasIg = (scanResult.portfolio_scan || []).some(function (p) {
      return p.has_ig && p.ig_account_id
    })

    // Caso 1: NENHUMA Página possui @brf_imoveis_ vinculado
    var hasTargetUsernameMatch = (scanResult.portfolio_scan || []).some(function (p) {
      if (!p.ig_username) return false
      return p.ig_username.toLowerCase().replace(/^@/, '').trim() === TARGET_CRM_USERNAME
    })

    // 1. Testa diretamente com o ID de Instagram atual
    var targetIgId = currentIgBizId || igBizId
    if (igToken && targetIgId && hasTargetUsernameMatch) {
      try {
        const igRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            targetIgId +
            '?fields=id,name,username,profile_picture_url',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + igToken },
          timeout: 15,
        })

        if (igRes.statusCode >= 200 && igRes.statusCode < 300) {
          const d = igRes.json || {}
          const igName = d.username || d.name || ''
          return e.json(200, {
            success: true,
            status: 'connected',
            message:
              'Conectado ✅' +
              (igName ? ' — @' + igName : '') +
              ' (ID: ' +
              targetIgId +
              ')' +
              (igAutoCorrected ? ' [ID corrigido automaticamente da Página]' : ''),
            data: d,
            token_saved: igAutoCorrected,
            auto_corrected: igAutoCorrected,
            old_instagram_business_id: igAutoCorrected ? oldIgBizId : undefined,
            instagram_business_id: targetIgId,
            token_source: tokenSource,
            has_oauth_token: !!oauthUserToken,
            token_identity: tokenIdentity,
            page_linked_instagram: pageLinkedInstagram,
            accessible_pages: accessiblePages,
            portfolio_scan: scanResult.portfolio_scan,
            portfolio_scan_error: scanResult.portfolio_scan_error,
            tested_tokens: [
              {
                type: tokenSource,
                token_suffix: maskToken(igToken),
                status: 'ok',
                http_status: igRes.statusCode,
              },
            ],
          })
        }
        savedTokenGraphError = extractGraphError(igRes.json, igRes.statusCode)
        testedTokens.push({
          type: tokenSource,
          token_suffix: maskToken(igToken),
          status: 'failed',
          http_status: savedTokenGraphError.http_status,
          graph_error: savedTokenGraphError,
        })
      } catch (netErr) {
        const msg = String(netErr && netErr.message ? netErr.message : netErr)
        savedTokenGraphError = {
          http_status: 0,
          message: 'Erro de rede ao conectar à Meta Graph API: ' + msg,
          code: null,
          subcode: null,
          user_msg: null,
          type: 'NetworkError',
        }
        testedTokens.push({
          type: tokenSource,
          token_suffix: maskToken(igToken),
          status: 'network_error',
          graph_error: savedTokenGraphError,
        })
      }
    }

    // Se nenhuma página tem o Instagram @brf_imoveis_ vinculado:
    // Retorna aviso claro com instruções exatas sem citar mauro.brfimoveis
    if (!hasTargetUsernameMatch) {
      var countPages = (scanResult.portfolio_scan || []).length
      var noTargetMsg =
        'Nenhuma das ' +
        (countPages || '3') +
        ' páginas acima possui o Instagram oficial @' +
        TARGET_CRM_USERNAME +
        ' vinculado. O vínculo precisa ser feito pelo aplicativo do Instagram (logando na conta @' +
        TARGET_CRM_USERNAME +
        " → Perfil → Configurações e privacidade → Ferramentas profissionais / Empresa → 'Conectar uma Página do Facebook' → selecionar a Página oficial da BRF Imóveis). Após vincular, clique em Verificar Agora."

      return e.json(200, {
        success: false,
        status: 'page_has_no_instagram',
        message: noTargetMsg,
        instructions: noTargetMsg,
        target_username: TARGET_CRM_USERNAME,
        token_source: tokenSource,
        has_oauth_token: !!oauthUserToken,
        token_identity: tokenIdentity,
        page_linked_instagram: pageLinkedInstagram,
        accessible_pages: accessiblePages,
        portfolio_scan: scanResult.portfolio_scan,
        portfolio_scan_error: scanResult.portfolio_scan_error,
        tested_tokens:
          testedTokens.length > 0
            ? testedTokens
            : [
                {
                  type: tokenSource,
                  token_suffix: maskToken(igToken),
                  status: 'page_has_no_target_instagram',
                },
              ],
        app_id: igAppId,
      })
    }

    // Fallback: se havia token salvo rejeitado
    if (savedTokenGraphError) {
      const errCode = savedTokenGraphError.code
      const errSubcode = savedTokenGraphError.subcode
      const errMsg = savedTokenGraphError.message || 'Token rejeitado pela Meta Graph API'
      const errCodeStr =
        errCode !== null
          ? ' (code ' + errCode + (errSubcode !== null ? ', subcode ' + errSubcode : '') + ')'
          : ''

      const tokenRejectionMsg =
        'O token salvo foi rejeitado pela Meta: ' +
        errMsg +
        errCodeStr +
        ' — reconecte via OAuth ou cole um novo Page Access Token.'

      return e.json(200, {
        success: false,
        status: 'configured_waiting_token',
        message: tokenRejectionMsg,
        instructions: tokenRejectionMsg,
        token_source: tokenSource,
        has_oauth_token: !!oauthUserToken,
        graph_error: savedTokenGraphError,
        token_identity: tokenIdentity,
        page_linked_instagram: pageLinkedInstagram,
        accessible_pages: accessiblePages,
        portfolio_scan: scanResult.portfolio_scan,
        portfolio_scan_error: scanResult.portfolio_scan_error,
        tested_tokens: testedTokens,
        app_id: igAppId,
      })
    }

    return e.json(200, {
      success: false,
      status: 'configured_waiting_token',
      message: 'Aguardando confirmação do vínculo do Instagram @' + TARGET_CRM_USERNAME + '.',
      instructions:
        'Verifique no app do Instagram o vínculo com a Página e clique em Verificar Agora.',
      token_source: tokenSource,
      has_oauth_token: !!oauthUserToken,
      token_identity: tokenIdentity,
      page_linked_instagram: pageLinkedInstagram,
      accessible_pages: accessiblePages,
      portfolio_scan: scanResult.portfolio_scan,
      portfolio_scan_error: scanResult.portfolio_scan_error,
      tested_tokens: testedTokens,
      app_id: igAppId,
    })
  },
  $apis.requireAuth(),
)

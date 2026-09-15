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

    const igBizId = (user.getString('meta_instagram_business_id') || '').trim()
    const oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    const pageTokenCandidate = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()

    // O token prioritário para inspeção inicial é o oauthUserToken se existir,
    // senão o pageTokenCandidate.
    let igToken = oauthUserToken || pageTokenCandidate
    let tokenSource = oauthUserToken
      ? 'oauth_user_token (salvo via OAuth)'
      : pageTokenCandidate
        ? 'page_token (salvo em meta_instagram_page_token/meta_page_access_token)'
        : 'nenhum'

    const igAppId = (
      user.getString('meta_instagram_app_id') ||
      user.getString('meta_app_id') ||
      ''
    ).trim()
    const sysUserToken = (user.getString('meta_whatsapp_access_token') || '').trim()
    const capiToken = (user.getString('meta_capi_token') || '').trim()

    if (!igBizId) {
      return e.json(200, {
        success: false,
        status: 'not_configured',
        message: 'Instagram Business ID não configurado no CRM.',
        instructions: 'Informe o Instagram Business ID nas configurações ou conecte via OAuth.',
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

    // Lista de tokens para varredura do portfólio e auto-descoberta:
    // Prioridade 1: OAuth User Token novo (enxerga as páginas do usuário)
    // Prioridade 2: System User Token
    // Prioridade 3: CAPI Token
    // Prioridade 4: Page Token
    const tokensToTry = []
    if (oauthUserToken) {
      tokensToTry.push({ token: oauthUserToken, type: 'oauth_user' })
    }
    if (sysUserToken && sysUserToken !== oauthUserToken) {
      tokensToTry.push({ token: sysUserToken, type: 'system_user' })
    }
    if (capiToken && capiToken !== sysUserToken && capiToken !== oauthUserToken) {
      tokensToTry.push({ token: capiToken, type: 'capi' })
    }
    if (
      pageTokenCandidate &&
      pageTokenCandidate !== oauthUserToken &&
      pageTokenCandidate !== sysUserToken &&
      pageTokenCandidate !== capiToken
    ) {
      tokensToTry.push({ token: pageTokenCandidate, type: 'page_token' })
    }

    const crmIgUsername = (user.getString('instagram_username') || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '')

    // =========================================================================
    // PASSO 3 HELPER: VARREDURA DO PORTFÓLIO
    // Consulta /me/accounts com os tokens disponíveis (priorizando oauth_user)
    // para listar TODAS as páginas e identificar onde o IG está vinculado
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
              '[INSTAGRAM_TEST] passo 3 varredura do portfólio (' +
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

              // Se a borda de accounts não veio com instagram_business_account expandida,
              // tenta consultar a página diretamente usando o page token retornado ou o token da varredura
              if (!igAcc && (pTok || scanToken)) {
                try {
                  var pDirectRes = $http.send({
                    url:
                      'https://graph.facebook.com/v22.0/' +
                      encodeURIComponent(pId) +
                      '?fields=instagram_business_account{id,username,name}&access_token=' +
                      encodeURIComponent(pTok || scanToken),
                    method: 'GET',
                    timeout: 8,
                  })
                  if (
                    pDirectRes.statusCode === 200 &&
                    pDirectRes.json &&
                    pDirectRes.json.instagram_business_account
                  ) {
                    igAcc = pDirectRes.json.instagram_business_account
                  }
                } catch (_) {}
              }

              var igId = igAcc && igAcc.id ? String(igAcc.id).trim() : null
              var igUser =
                igAcc && (igAcc.username || igAcc.name)
                  ? String(igAcc.username || igAcc.name).trim()
                  : null
              var hasIg = !!igAcc

              var isTargetUser = false
              if (igUser && crmIgUsername) {
                var cleanFound = igUser.toLowerCase().replace(/^@/, '')
                if (
                  cleanFound === crmIgUsername ||
                  cleanFound.indexOf(crmIgUsername) !== -1 ||
                  crmIgUsername.indexOf(cleanFound) !== -1
                ) {
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
                  (isTargetUser ? ' [MATCH USUÁRIO ALVO @' + crmIgUsername + '!]' : ''),
              )

              scanResult.push({
                page_id: pId,
                page_name: pName,
                ig_account_id: igId,
                ig_username: igUser,
                has_ig: hasIg,
              })

              // Se encontramos a conta vinculada e o usuário ainda não tinha ou era diferente:
              if (igId && (isTargetUser || !currentIgBizId || scanResult.length === 1)) {
                if (igId !== currentIgBizId) {
                  try {
                    user.set('meta_instagram_business_id', igId)
                    if (igUser) {
                      user.set('instagram_username', igUser)
                    }
                    if (pTok) {
                      user.set('meta_instagram_page_token', pTok)
                      user.set('meta_page_access_token', pTok)
                    }
                    $app.saveNoValidate(user)
                    igAutoCorrected = true
                    currentIgBizId = igId
                    console.log(
                      '[INSTAGRAM_TEST] Auto-correção via varredura do portfólio: igId=' +
                        igId +
                        ' (@' +
                        igUser +
                        ')',
                    )
                  } catch (eSave) {
                    console.log(
                      '[INSTAGRAM_TEST] Erro ao salvar auto-correção via scan: ' + String(eSave),
                    )
                  }
                }
              }
            }

            if (pagesData.length > 0) {
              return {
                portfolio_scan: scanResult,
                portfolio_scan_error: null,
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
        portfolio_scan: scanResult,
        portfolio_scan_error: lastScanError || 'Falha ao consultar páginas do portfólio na Meta.',
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
          // Fallback: se fields=id,name,type falhar (ex: 'type' inválido para certos nós), tenta me?fields=id,name
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
          url: 'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,instagram_business_account{id,username,name}&limit=50',
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

            // Se a expansão de instagram_business_account não veio na lista de accounts, consulta a página
            if (!rIg && rPageId && (rPageTok || igToken)) {
              try {
                var directPgIg = $http.send({
                  url:
                    'https://graph.facebook.com/v22.0/' +
                    encodeURIComponent(rPageId) +
                    '?fields=instagram_business_account{id,username,name}&access_token=' +
                    encodeURIComponent(rPageTok || igToken),
                  method: 'GET',
                  timeout: 8,
                })
                if (
                  directPgIg.statusCode === 200 &&
                  directPgIg.json &&
                  directPgIg.json.instagram_business_account
                ) {
                  rIg = directPgIg.json.instagram_business_account
                }
              } catch (_) {}
            }

            var parsedPage = {
              page_id: rPg.id || '',
              page_name: rPg.name || '',
              has_instagram: !!rIg,
              ig_account_id: (rIg && rIg.id) || null,
              ig_username: (rIg && (rIg.username || rIg.name)) || null,
              matches_target_id: !!(rIg && rIg.id === currentIgBizId),
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
                (parsedPage.matches_target_id ? ' [MATCH ALVO!]' : ''),
            )

            // Se encontramos conta vinculada nesta página e ela é a página com o Instagram procurado:
            if (rIg && rIg.id) {
              var candIgId = String(rIg.id).trim()
              var candIgUser = String(rIg.username || rIg.name || '').trim()
              var matchTarget =
                (crmIgUsername &&
                  candIgUser.toLowerCase().replace(/^@/, '').indexOf(crmIgUsername) !== -1) ||
                candIgId === currentIgBizId ||
                !pageLinkedInstagram

              if (matchTarget && !pageLinkedInstagram) {
                pageLinkedInstagram = {
                  linked: true,
                  id: candIgId,
                  username: candIgUser,
                  name: rIg.name || candIgUser,
                  page_id: parsedPage.page_id,
                  page_name: parsedPage.page_name,
                }

                if (candIgId !== currentIgBizId) {
                  console.log(
                    '[INSTAGRAM_TEST] IG ID corrigido automaticamente via passo 0: ' +
                      currentIgBizId +
                      ' -> ' +
                      candIgId +
                      ' (@' +
                      candIgUser +
                      ')',
                  )
                  try {
                    user.set('meta_instagram_business_id', candIgId)
                    if (candIgUser) user.set('instagram_username', candIgUser)
                    if (rPageTok) {
                      user.set('meta_instagram_page_token', rPageTok)
                      user.set('meta_page_access_token', rPageTok)
                    }
                    $app.saveNoValidate(user)
                    igAutoCorrected = true
                    currentIgBizId = candIgId
                  } catch (e0) {
                    console.log(
                      '[INSTAGRAM_TEST] Erro ao salvar autocorreção no passo 0: ' + String(e0),
                    )
                  }
                }
              }
            }
          }
        } else {
          var accErr = extractGraphError(accRes.json, accRes.statusCode)
          // Se for erro de campo inexistente (accounts), confirma que o token é de PÁGINA (não usuário)
          if (
            accErr.message &&
            accErr.message.indexOf('Tried accessing nonexisting field (accounts)') !== -1
          ) {
            isPageToken = true
            console.log(
              '[INSTAGRAM_TEST] passo 0 /me/accounts: token é um Page Token (não possui borda /accounts, comportamento esperado)',
            )
          } else {
            console.log(
              '[INSTAGRAM_TEST] passo 0 /me/accounts falhou (token ' +
                tokenSuffix +
                '): HTTP ' +
                accErr.http_status +
                ' code=' +
                (accErr.code !== null ? accErr.code : 'n/a') +
                ' subcode=' +
                (accErr.subcode !== null ? accErr.subcode : 'n/a') +
                ' msg=' +
                accErr.message,
            )
          }
        }
      } catch (accNetErr) {
        var accNetMsg = String(accNetErr && accNetErr.message ? accNetErr.message : accNetErr)
        console.log(
          '[INSTAGRAM_TEST] passo 0 /me/accounts erro de rede (token ' +
            tokenSuffix +
            '): ' +
            accNetMsg,
        )
      }

      // =========================================================================
      // PASSO 0.5: CONSULTA À PRÓPRIA PÁGINA
      // Se /me retornou uma identidade válida e/ou identificamos como Page Token,
      // perguntamos à Página qual Instagram Business Account está vinculada a ela
      // =========================================================================
      var pageIdCandidate = (tokenIdentity && tokenIdentity.id) || ''
      if (pageIdCandidate && !tokenIdentity.error) {
        try {
          var pageIgRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              encodeURIComponent(pageIdCandidate) +
              '?fields=instagram_business_account{id,username,name}',
            method: 'GET',
            headers: { Authorization: 'Bearer ' + igToken },
            timeout: 12,
          })

          if (pageIgRes.statusCode >= 200 && pageIgRes.statusCode < 300 && pageIgRes.json) {
            var igBizObj = pageIgRes.json.instagram_business_account || null
            if (igBizObj && igBizObj.id) {
              var foundIgId = String(igBizObj.id).trim()
              var foundIgUsername = (igBizObj.username || igBizObj.name || '').trim()
              pageLinkedInstagram = {
                linked: true,
                id: foundIgId,
                username: foundIgUsername,
                name: igBizObj.name || foundIgUsername,
                page_id: pageIdCandidate,
                page_name: tokenIdentity.name || '',
              }
              console.log(
                '[INSTAGRAM_TEST] passo 0.5 página ' +
                  pageIdCandidate +
                  ': instagram_business_account=' +
                  foundIgId +
                  ' username=@' +
                  (foundIgUsername || 'n/a'),
              )

              // Adiciona ou enriquece accessiblePages com a própria página
              accessiblePages.push({
                page_id: pageIdCandidate,
                page_name: tokenIdentity.name || 'Página do Token',
                has_instagram: true,
                ig_account_id: foundIgId,
                ig_username: foundIgUsername,
                matches_target_id: foundIgId === currentIgBizId,
              })

              // Se o ID encontrado for DIFERENTE do gravado no CRM, corrige automaticamente
              if (foundIgId !== currentIgBizId) {
                console.log(
                  '[INSTAGRAM_TEST] IG ID corrigido automaticamente: ' +
                    currentIgBizId +
                    ' -> ' +
                    foundIgId +
                    ' (@' +
                    foundIgUsername +
                    ')',
                )
                try {
                  user.set('meta_instagram_business_id', foundIgId)
                  if (foundIgUsername) {
                    user.set('instagram_username', foundIgUsername)
                  }
                  $app.saveNoValidate(user)
                  igAutoCorrected = true
                  currentIgBizId = foundIgId
                } catch (saveErr) {
                  console.log(
                    '[INSTAGRAM_TEST] Erro ao salvar correção automática do IG ID: ' +
                      String(saveErr),
                  )
                }
              }
            } else {
              pageLinkedInstagram = {
                linked: false,
                id: null,
                username: null,
                page_id: pageIdCandidate,
                page_name: tokenIdentity.name || '',
              }
              console.log(
                '[INSTAGRAM_TEST] passo 0.5 página ' +
                  pageIdCandidate +
                  ': instagram_business_account=NENHUM username=NENHUM',
              )
              accessiblePages.push({
                page_id: pageIdCandidate,
                page_name: tokenIdentity.name || 'Página do Token',
                has_instagram: false,
                ig_account_id: null,
                ig_username: null,
                matches_target_id: false,
              })
            }
          } else {
            var pageErr = extractGraphError(pageIgRes.json, pageIgRes.statusCode)
            console.log(
              '[INSTAGRAM_TEST] passo 0.5 consulta página ' +
                pageIdCandidate +
                ' falhou: HTTP ' +
                pageErr.http_status +
                ' code=' +
                (pageErr.code !== null ? pageErr.code : 'n/a') +
                ' msg=' +
                pageErr.message,
            )
          }
        } catch (pageNetErr) {
          console.log(
            '[INSTAGRAM_TEST] passo 0.5 erro de rede na consulta à página ' +
              pageIdCandidate +
              ': ' +
              String(pageNetErr),
          )
        }
      }
    }

    // Se no passo 0.5 a primeira página isolada não tinha vínculo, NÃO encerra imediatamente:
    // executa a varredura do portfólio primeiro para ver se outra página tem o vínculo!
    var scanEarly = runPortfolioScan()

    // Se a varredura encontrou uma página com Instagram vinculado ou auto-corrigiu:
    var matchedFromScan = (scanEarly.portfolio_scan || []).find(function (p) {
      return p.has_ig && p.ig_account_id
    })
    if (matchedFromScan) {
      pageLinkedInstagram = {
        linked: true,
        id: matchedFromScan.ig_account_id,
        username: matchedFromScan.ig_username,
        name: matchedFromScan.ig_username || matchedFromScan.page_name,
        page_id: matchedFromScan.page_id,
        page_name: matchedFromScan.page_name,
      }
      targetIgId = matchedFromScan.ig_account_id
      currentIgBizId = matchedFromScan.ig_account_id
    }

    if (pageLinkedInstagram && pageLinkedInstagram.linked === false && !matchedFromScan) {
      var noIgMsg =
        "A Página '" +
        (tokenIdentity.name || 'BRF Imóveis') +
        "' NÃO tem nenhuma conta do Instagram vinculada. Vínculo necessário: no app do Instagram (@mauro.brfimoveis) → Configurações → Empresa/Ferramentas profissionais → 'Conectar uma Página do Facebook' → escolher a Página " +
        (tokenIdentity.name || 'BRF Imóveis') +
        '. Aguarde ~5 minutos e clique Verificar Agora.'

      console.log(
        '[INSTAGRAM_TEST] Página sem Instagram vinculado e nenhuma outra encontrada no scan. Retornando diagnóstico.',
      )

      return e.json(200, {
        success: false,
        status: 'page_has_no_instagram',
        message: noIgMsg,
        instructions: noIgMsg,
        token_source: tokenSource,
        has_oauth_token: !!oauthUserToken,
        token_identity: tokenIdentity,
        page_linked_instagram: pageLinkedInstagram,
        accessible_pages: accessiblePages,
        portfolio_scan: scanEarly.portfolio_scan,
        portfolio_scan_error: scanEarly.portfolio_scan_error,
        tested_tokens: [
          {
            type: tokenSource,
            token_suffix: maskToken(igToken),
            status: 'page_has_no_instagram',
          },
        ],
        app_id: igAppId,
      })
    }

    // 1. Testa diretamente com o ID de Instagram (usa currentIgBizId que pode ter sido corrigido no passo 0.5)
    var targetIgId = currentIgBizId || igBizId
    if (igToken && targetIgId) {
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
          const scanPass1 = runPortfolioScan()
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
            portfolio_scan: scanPass1.portfolio_scan,
            portfolio_scan_error: scanPass1.portfolio_scan_error,
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
        console.log(
          '[INSTAGRAM_TEST] passo 1 (token salvo) falhou: HTTP ' +
            savedTokenGraphError.http_status +
            ' code=' +
            (savedTokenGraphError.code !== null ? savedTokenGraphError.code : 'n/a') +
            ' subcode=' +
            (savedTokenGraphError.subcode !== null ? savedTokenGraphError.subcode : 'n/a') +
            ' msg=' +
            savedTokenGraphError.message,
        )

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
        console.log('[INSTAGRAM_TEST] passo 1 (token salvo) falhou: ' + msg)
        testedTokens.push({
          type: tokenSource,
          token_suffix: maskToken(igToken),
          status: 'network_error',
          graph_error: savedTokenGraphError,
        })
      }
    }

    // 2. Auto-descoberta via System User Token (ou CAPI Token)
    // (tokensToTry já inicializado no topo da rota)

    let discoveredPageToken = ''
    let matchedPageId = ''
    let matchedPageName = ''
    let igAccountData = null
    let allPermissions = []
    let permissionsSourceToken = ''

    for (let t = 0; t < tokensToTry.length; t++) {
      const candidateItem = tokensToTry[t]
      const candidate = candidateItem.token
      const candType = candidateItem.type
      const candSuffix = maskToken(candidate)

      try {
        // Obter permissões concedidas neste token
        try {
          const permRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
              encodeURIComponent(candidate),
            method: 'GET',
            timeout: 10,
          })
          if (permRes.statusCode === 200 && permRes.json && Array.isArray(permRes.json.data)) {
            allPermissions = permRes.json.data
              .filter((p) => p.status === 'granted')
              .map((p) => p.permission)
            permissionsSourceToken = candType
          } else {
            const pErr = extractGraphError(permRes.json, permRes.statusCode)
            console.log(
              '[INSTAGRAM_TEST] auto-descoberta permissions (' +
                candType +
                ') falhou: HTTP ' +
                pErr.http_status +
                ' code=' +
                (pErr.code !== null ? pErr.code : 'n/a') +
                ' subcode=' +
                (pErr.subcode !== null ? pErr.subcode : 'n/a') +
                ' msg=' +
                pErr.message,
            )
          }
        } catch (pNetErr) {
          console.log(
            '[INSTAGRAM_TEST] auto-descoberta permissions (' +
              candType +
              ') erro de rede: ' +
              String(pNetErr),
          )
        }

        // Tentar teste direto com candidate
        const directIgRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            igBizId +
            '?fields=id,name,username,profile_picture_url&access_token=' +
            encodeURIComponent(candidate),
          method: 'GET',
          timeout: 10,
        })

        if (directIgRes.statusCode >= 200 && directIgRes.statusCode < 300) {
          discoveredPageToken = candidate
          igAccountData = directIgRes.json || {}
          testedTokens.push({
            type: candType,
            token_suffix: candSuffix,
            status: 'ok',
            http_status: directIgRes.statusCode,
          })
          break
        }

        const directErr = extractGraphError(directIgRes.json, directIgRes.statusCode)
        console.log(
          '[INSTAGRAM_TEST] auto-descoberta direct (' +
            candType +
            ') falhou: HTTP ' +
            directErr.http_status +
            ' code=' +
            (directErr.code !== null ? directErr.code : 'n/a') +
            ' subcode=' +
            (directErr.subcode !== null ? directErr.subcode : 'n/a') +
            ' msg=' +
            directErr.message,
        )

        // Tentar /me/accounts para buscar páginas gerenciadas e seus tokens
        const accountsRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=' +
            encodeURIComponent(candidate),
          method: 'GET',
          timeout: 10,
        })

        if (
          accountsRes.statusCode === 200 &&
          accountsRes.json &&
          Array.isArray(accountsRes.json.data)
        ) {
          const pages = accountsRes.json.data
          for (let p = 0; p < pages.length; p++) {
            const pg = pages[p]
            const pgToken = pg.access_token || ''
            const pgIg = pg.instagram_business_account || {}
            if (pgIg.id === igBizId || (!discoveredPageToken && pgToken)) {
              discoveredPageToken = pgToken
              matchedPageId = pg.id || ''
              matchedPageName = pg.name || ''
              if (pgIg.id) {
                igAccountData = pgIg
                break
              }
            }
          }
          testedTokens.push({
            type: candType,
            token_suffix: candSuffix,
            status: discoveredPageToken ? 'ok' : 'no_matching_page',
            http_status: accountsRes.statusCode,
            accounts_count: pages.length,
          })
          if (discoveredPageToken && igAccountData) break
        } else {
          const accErr = extractGraphError(accountsRes.json, accountsRes.statusCode)
          console.log(
            '[INSTAGRAM_TEST] auto-descoberta me/accounts (' +
              candType +
              ') falhou: HTTP ' +
              accErr.http_status +
              ' code=' +
              (accErr.code !== null ? accErr.code : 'n/a') +
              ' subcode=' +
              (accErr.subcode !== null ? accErr.subcode : 'n/a') +
              ' msg=' +
              accErr.message,
          )
          testedTokens.push({
            type: candType,
            token_suffix: candSuffix,
            status: 'failed',
            direct_error: directErr,
            accounts_error: accErr,
          })
        }
      } catch (candErr) {
        console.log(
          '[INSTAGRAM_TEST] auto-descoberta (' + candType + ') falhou: ' + String(candErr),
        )
        testedTokens.push({
          type: candType,
          token_suffix: candSuffix,
          status: 'network_error',
          message: String(candErr && candErr.message ? candErr.message : candErr),
        })
      }
    }

    // 3. Se obteve um token válido com sucesso, salva no usuário e retorna status connected
    if (discoveredPageToken) {
      try {
        user.set('meta_instagram_page_token', discoveredPageToken)
        if (!user.getString('meta_page_access_token')) {
          user.set('meta_page_access_token', discoveredPageToken)
        }
        $app.saveNoValidate(user)

        const igName = igAccountData
          ? igAccountData.username || igAccountData.name || ''
          : matchedPageName
        const scanDiscovered = runPortfolioScan()
        return e.json(200, {
          success: true,
          status: 'connected',
          message: 'Conectado com sucesso ✅' + (igName ? ' — @' + igName : '') + '!',
          token_saved: true,
          data: igAccountData || { id: targetIgId, name: igName },
          page_id: matchedPageId,
          page_name: matchedPageName,
          token_source: tokenSource,
          has_oauth_token: !!oauthUserToken,
          token_identity: tokenIdentity,
          page_linked_instagram: pageLinkedInstagram,
          accessible_pages: accessiblePages,
          portfolio_scan: scanDiscovered.portfolio_scan,
          portfolio_scan_error: scanDiscovered.portfolio_scan_error,
          tested_tokens: testedTokens,
        })
      } catch (saveErr) {
        console.log('[INSTAGRAM_TEST] Erro ao salvar token: ' + String(saveErr))
      }
    }

    // 4. Se não conseguiu obter automaticamente, analisa o motivo e retorna orientações claras.
    // REGRA DE OURO:
    // Se o token salvo existiu mas foi rejeitado pela Graph API, a mensagem principal DEVE ser sobre
    // o token (ex.: código 190 expirado/inválido, código 10 sem permissão, etc.), e NÃO a mensagem enganosa
    // "Faltam permissões do Instagram na Meta", porque as permissões avaliadas abaixo vieram dos tokens
    // de auto-descoberta (system user/CAPI) que pertencem a outro app e não refletem o app dedicado do Instagram.
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

      const scanRejection = runPortfolioScan()

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
        portfolio_scan: scanRejection.portfolio_scan,
        portfolio_scan_error: scanRejection.portfolio_scan_error,
        tested_tokens: testedTokens,
        app_id: igAppId,
      })
    }

    // Se NÃO havia token salvo, analisa permissões (só se vieram de token relevante)
    const hasBasic =
      allPermissions.indexOf('instagram_basic') !== -1 ||
      allPermissions.indexOf('instagram_business_basic') !== -1

    const missingPerms = []
    if (!hasBasic) missingPerms.push('instagram_basic')

    let instructionMsg = ''
    if (allPermissions.length > 0 && missingPerms.length > 0) {
      instructionMsg =
        'Faltam permissões do Instagram na Meta (' +
        missingPerms.join(', ') +
        '). Clique em "Conectar Instagram (OAuth)" abaixo para autorizar a conexão.'
    } else {
      instructionMsg =
        'O Instagram ID ' +
        igBizId +
        ' não possui Page Token ativo vinculado. Conecte pelo botão "Conectar Instagram (OAuth)" ou cole o Page Access Token manualmente.'
    }

    const scanFallback = runPortfolioScan()

    return e.json(200, {
      success: false,
      status: 'configured_waiting_token',
      message: instructionMsg,
      missing_perms: missingPerms,
      granted_perms: allPermissions,
      instructions: instructionMsg,
      token_source: tokenSource,
      has_oauth_token: !!oauthUserToken,
      token_identity: tokenIdentity,
      page_linked_instagram: pageLinkedInstagram,
      accessible_pages: accessiblePages,
      portfolio_scan: scanFallback.portfolio_scan,
      portfolio_scan_error: scanFallback.portfolio_scan_error,
      tested_tokens: testedTokens,
      app_id: igAppId,
    })
  },
  $apis.requireAuth(),
)

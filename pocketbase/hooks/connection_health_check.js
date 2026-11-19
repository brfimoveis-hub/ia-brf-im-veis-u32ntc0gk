routerAdd(
  'POST',
  '/backend/v1/connection_health_check',
  (e) => {
    const body = e.requestInfo().body || {}
    const only = body.connection || ''
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    let userRecord = null
    try {
      userRecord = $app.findRecordById('users', userId)
    } catch (_) {
      return e.json(200, { success: false, error: 'User not found' })
    }

    const ts = new Date().toISOString()
    const results = []

    var shouldCheck = function (name) {
      return !only || only === name
    }

    if (shouldCheck('whatsapp')) {
      const pnId = userRecord.getString('meta_whatsapp_phone_number_id')
      const token = userRecord.getString('meta_whatsapp_access_token')
      if (!pnId || !token) {
        results.push({
          name: 'WhatsApp Cloud API',
          key: 'whatsapp',
          status: 'not_configured',
          timestamp: ts,
          message: 'Phone Number ID ou Access Token não configurados',
        })
      } else {
        try {
          // v0.0.1420 (prova [APP_SECRET_FIX]): o app exige App Secret em TODAS
          // as chamadas de servidor — sem proof a Meta devolve code 100
          // "API calls from the server require an appsecret_proof argument".
          // O token WhatsApp é do app 2442476629610638, cuja secret correta
          // (provada por /me + debug_token nos logs) está em meta_app_secret.
          let waProof = ''
          try {
            const waSecret =
              (userRecord.getString('meta_app_secret') || '').trim() ||
              String($os.getenv('META_APP_SECRET') || '').trim()
            if (waSecret) {
              waProof = '&appsecret_proof=' + $security.hs256(String(token), waSecret)
            }
          } catch (_) {}
          const res = $http.send({
            url:
              'https://graph.facebook.com/v21.0/' +
              pnId +
              '?fields=code_verification_status,quality_rating,status,verified_name,id,display_phone_number' +
              waProof,
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token },
            timeout: 15,
          })
          if (res.statusCode >= 200 && res.statusCode < 300) {
            var dispPhone = ''
            try {
              dispPhone =
                res.json && res.json.display_phone_number ? res.json.display_phone_number : ''
            } catch (_) {}
            // Atualiza status no registro do usuário se pertencer a ele
            try {
              userRecord.set('meta_token_status', 'active')
              if (dispPhone) {
                userRecord.set('meta_whatsapp_status', dispPhone)
              }
              $app.saveNoValidate(userRecord)
            } catch (_) {}

            results.push({
              name: 'WhatsApp Cloud API',
              key: 'whatsapp',
              status: 'connected',
              timestamp: ts,
              message:
                'Conectado ✅ — ' +
                (dispPhone ? 'Número: ' + dispPhone : 'HTTP 200 da Meta Graph API'),
            })
          } else {
            var waErr = {}
            try {
              waErr = res.json && res.json.error ? res.json.error : {}
            } catch (_) {}
            try {
              userRecord.set('meta_token_status', 'error')
              $app.saveNoValidate(userRecord)
            } catch (_) {}
            results.push({
              name: 'WhatsApp Cloud API',
              key: 'whatsapp',
              status: 'error',
              timestamp: ts,
              message: waErr.message || 'HTTP ' + res.statusCode,
              details: { status_code: res.statusCode, error_code: waErr.code || 0 },
            })
          }
        } catch (e2) {
          results.push({
            name: 'WhatsApp Cloud API',
            key: 'whatsapp',
            status: 'error',
            timestamp: ts,
            message: 'Erro de rede: ' + (e2.message || 'unknown'),
          })
        }
      }
    }

    if (shouldCheck('capi')) {
      const pixelId =
        userRecord.getString('meta_dataset_id') || userRecord.getString('meta_pixel_id')
      const capiToken = userRecord.getString('meta_capi_token')
      if (!pixelId || !capiToken) {
        results.push({
          name: 'Meta Conversions API (CAPI)',
          key: 'capi',
          status: 'not_configured',
          timestamp: ts,
          message: 'Pixel/Dataset ID ou Token CAPI não configurados',
        })
      } else {
        try {
          // Tokens CAPI diretos são write-only para o dataset. Validação via envio POST /events:
          const pxRes = $http.send({
            url: 'https://graph.facebook.com/v21.0/' + pixelId + '/events',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + capiToken,
            },
            body: JSON.stringify({
              data: [
                {
                  event_name: 'Lead',
                  event_time: Math.floor(Date.now() / 1000),
                  action_source: 'system_generated',
                  user_data: {
                    em: [$security.sha256('healthcheck@brfimoveis.com.br')],
                  },
                },
              ],
            }),
            timeout: 15,
          })
          if (pxRes.statusCode >= 200 && pxRes.statusCode < 300) {
            results.push({
              name: 'Meta Conversions API (CAPI)',
              key: 'capi',
              status: 'connected',
              timestamp: ts,
              message: 'Conectado ✅ — Dataset ' + pixelId,
            })
          } else {
            var xErr = {}
            try {
              xErr = pxRes.json && pxRes.json.error ? pxRes.json.error : {}
            } catch (_) {}
            results.push({
              name: 'Meta Conversions API (CAPI)',
              key: 'capi',
              status: 'error',
              timestamp: ts,
              message: xErr.message || 'Erro ao validar Dataset (HTTP ' + pxRes.statusCode + ')',
            })
          }
        } catch (e3) {
          results.push({
            name: 'Meta Conversions API (CAPI)',
            key: 'capi',
            status: 'error',
            timestamp: ts,
            message: 'Erro de rede: ' + (e3.message || 'unknown'),
          })
        }
      }
    }

    if (shouldCheck('webhook')) {
      const vt = userRecord.getString('meta_whatsapp_verify_token')
      if (vt) {
        results.push({
          name: 'WhatsApp Webhook',
          key: 'webhook',
          status: 'connected',
          timestamp: ts,
          message: 'Verify Token configurado ✅ — pronto para receber webhooks',
        })
      } else {
        results.push({
          name: 'WhatsApp Webhook',
          key: 'webhook',
          status: 'not_configured',
          timestamp: ts,
          message: 'Verify Token do webhook não configurado',
        })
      }
    }

    if (shouldCheck('chavesnamao')) {
      results.push({
        name: 'Portal Chaves na Mão',
        key: 'chavesnamao',
        status: 'connected',
        timestamp: ts,
        message: 'Webhook URL configurado ✅ — user_id vinculado',
      })
    }

    // v0.0.1429 — healthSecret/proofFor movidos para o escopo do HANDLER
    // (estavam declarados dentro do bloco do Instagram e o bloco do Messenger
    // referenciava proofFor fora do escopo → ReferenceError "proofFor is not
    // defined" capturado como "Erro de rede" no cartão do Messenger).
    // Secret: meta_app_secret → meta_instagram_app_secret → env
    // META_APP_SECRET (mesma precedência provada no save_and_subscribe).
    const healthSecret =
      (userRecord.getString('meta_app_secret') || '').trim() ||
      (userRecord.getString('meta_instagram_app_secret') || '').trim() ||
      String($os.getenv('META_APP_SECRET') || '').trim()
    const proofFor = function (tok) {
      if (!tok || !healthSecret) return ''
      try {
        return '&appsecret_proof=' + $security.hs256(String(tok), healthSecret)
      } catch (_) {
        return ''
      }
    }

    if (shouldCheck('instagram')) {
      let igBizId = (userRecord.getString('meta_instagram_business_id') || '').trim()
      const oauthUserToken = (userRecord.getString('meta_instagram_user_token') || '').trim()
      const pageTokenCandidate = (
        userRecord.getString('meta_instagram_page_token') ||
        userRecord.getString('meta_page_access_token') ||
        ''
      ).trim()
      // v0.0.1425 — prioridade INVERTIDA: o Page Token gravado pelo "Salvar e
      // Assinar" é o token que a Meta já aceitou (prova nos logs); o token de
      // usuário OAuth antigo pode estar expirado e não pode pintar "0 páginas"
      // no Painel de Saúde enquanto o cartão do Instagram está verde.
      let igToken = pageTokenCandidate || oauthUserToken
      const igAppId = (userRecord.getString('meta_instagram_app_id') || '2442476629610638').trim()
      const sysUserToken = (userRecord.getString('meta_whatsapp_access_token') || '').trim()
      const capiToken = (userRecord.getString('meta_capi_token') || '').trim()

      // (proof/healthSecret agora no escopo do handler — v0.0.1429.)

      function maskTok(tok) {
        if (!tok || typeof tok !== 'string') return ''
        var tr = tok.trim()
        if (tr.length <= 4) return '***'
        return '...' + tr.slice(-4)
      }

      function extractErr(resJson, status) {
        var errObj = (resJson && resJson.error) || {}
        return {
          http_status: status || 0,
          message: errObj.message || (resJson && resJson.error_message) || 'HTTP ' + status,
          code: typeof errObj.code === 'number' ? errObj.code : errObj.code || null,
          subcode:
            typeof errObj.error_subcode === 'number'
              ? errObj.error_subcode
              : errObj.error_subcode || null,
          user_msg: errObj.error_user_msg || errObj.error_user_title || null,
        }
      }

      if (!igBizId && !igToken) {
        results.push({
          name: 'Instagram Business',
          key: 'instagram',
          status: 'not_configured',
          timestamp: ts,
          message: 'Instagram Business ID e Page Token não configurados',
        })
      } else {
        // Tentativa de validar token atual se existir
        let connected = false
        let verifiedName = ''
        let savedGraphErr = null
        const testedTokens = []
        let tokenIdentity = null
        const accessiblePages = []
        let pageLinkedIg = null

        if (igToken) {
          const tokenSuffix = maskTok(igToken)

          // Passo 0: Anatomia do token (/me e /me/accounts)
          try {
            const meRes = $http.send({
              url: 'https://graph.facebook.com/v22.0/me?fields=id,name,type' + proofFor(igToken),
              method: 'GET',
              headers: { Authorization: 'Bearer ' + igToken },
              timeout: 10,
            })
            if (meRes.statusCode >= 200 && meRes.statusCode < 300 && meRes.json) {
              tokenIdentity = {
                id: meRes.json.id || '',
                name: meRes.json.name || '',
                type: meRes.json.type || 'user_or_page',
                http_status: meRes.statusCode,
              }
              console.log(
                '[INSTAGRAM_HEALTH] passo 0 /me (token ' +
                  tokenSuffix +
                  '): id=' +
                  tokenIdentity.id +
                  ' name="' +
                  tokenIdentity.name +
                  '"',
              )
            } else {
              const meFallback = $http.send({
                url: 'https://graph.facebook.com/v22.0/me?fields=id,name' + proofFor(igToken),
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
              } else {
                tokenIdentity = {
                  error: extractErr(meRes.json, meRes.statusCode),
                  http_status: meRes.statusCode,
                }
              }
            }
          } catch (meErr) {
            tokenIdentity = {
              error: { http_status: 0, message: String(meErr) },
            }
          }

          try {
            const accRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,instagram_business_account{id,username,name}&limit=50' +
                proofFor(igToken),
              method: 'GET',
              headers: { Authorization: 'Bearer ' + igToken },
              timeout: 10,
            })
            if (
              accRes.statusCode >= 200 &&
              accRes.statusCode < 300 &&
              accRes.json &&
              Array.isArray(accRes.json.data)
            ) {
              for (let pi = 0; pi < accRes.json.data.length; pi++) {
                const rPg = accRes.json.data[pi]
                const rIg = rPg.instagram_business_account || null
                const rPageTok = rPg.access_token || ''
                let rIgId = (rIg && rIg.id) || null
                let rIgUser = (rIg && (rIg.username || rIg.name)) || null

                if (rIgId && !rIgUser) {
                  try {
                    const dIgRes = $http.send({
                      url:
                        'https://graph.facebook.com/v22.0/' +
                        encodeURIComponent(rIgId) +
                        '?fields=username,name&access_token=' +
                        encodeURIComponent(rPageTok || igToken) +
                        (rPageTok ? '' : proofFor(igToken)),
                      method: 'GET',
                      timeout: 8,
                    })
                    if (dIgRes.statusCode >= 200 && dIgRes.statusCode < 300 && dIgRes.json) {
                      rIgUser = (dIgRes.json.username || dIgRes.json.name || '').trim() || null
                    }
                  } catch (_) {}
                }

                const cleanU = (rIgUser || '').toLowerCase().replace(/^@/, '').trim()
                const isTargetMatch = !!(rIgId && rIgUser && cleanU === 'brf_imoveis_')

                accessiblePages.push({
                  page_id: rPg.id || '',
                  page_name: rPg.name || '',
                  has_instagram: !!rIgId,
                  ig_account_id: rIgId,
                  ig_username: rIgUser,
                  matches_target_id: isTargetMatch,
                })
              }
              console.log(
                '[INSTAGRAM_HEALTH] passo 0 /me/accounts: ' +
                  accessiblePages.length +
                  ' páginas encontradas',
              )
            }
          } catch (_) {}

          // Passo 0.5: se /me retornou uma página, consulta a própria página por instagram_business_account
          let currentIgTarget = igBizId
          const pageCandidateId = (tokenIdentity && tokenIdentity.id) || ''
          if (pageCandidateId && !tokenIdentity.error) {
            try {
              const pIgRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/' +
                  encodeURIComponent(pageCandidateId) +
                  '?fields=instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}' +
                  proofFor(igToken),
                method: 'GET',
                headers: { Authorization: 'Bearer ' + igToken },
                timeout: 10,
              })
              if (pIgRes.statusCode >= 200 && pIgRes.statusCode < 300 && pIgRes.json) {
                let igObj =
                  pIgRes.json.instagram_business_account ||
                  pIgRes.json.connected_instagram_account ||
                  null
                if (
                  !igObj &&
                  pIgRes.json.page_backed_instagram_accounts &&
                  pIgRes.json.page_backed_instagram_accounts.data &&
                  pIgRes.json.page_backed_instagram_accounts.data.length > 0
                ) {
                  const pbItem = pIgRes.json.page_backed_instagram_accounts.data[0]
                  if (pbItem && pbItem.id) {
                    igObj = { id: pbItem.id, username: pbItem.username || '' }
                  }
                }

                if (igObj && igObj.id) {
                  let lUser = (igObj.username || igObj.name || '').trim()
                  if (!lUser) {
                    try {
                      const dLRes = $http.send({
                        url:
                          'https://graph.facebook.com/v22.0/' +
                          encodeURIComponent(igObj.id) +
                          '?fields=username,name&access_token=' +
                          encodeURIComponent(igToken) +
                          proofFor(igToken),
                        method: 'GET',
                        timeout: 8,
                      })
                      if (dLRes.statusCode >= 200 && dLRes.statusCode < 300 && dLRes.json) {
                        lUser = (dLRes.json.username || dLRes.json.name || '').trim()
                      }
                    } catch (_) {}
                  }

                  pageLinkedIg = {
                    linked: true,
                    id: String(igObj.id).trim(),
                    username: lUser,
                  }
                  const cleanLU = (pageLinkedIg.username || '')
                    .toLowerCase()
                    .replace(/^@/, '')
                    .trim()
                  accessiblePages.push({
                    page_id: pageCandidateId,
                    page_name: tokenIdentity.name || 'Página do Token',
                    has_instagram: true,
                    ig_account_id: pageLinkedIg.id,
                    ig_username: pageLinkedIg.username,
                    matches_target_id: cleanLU === 'brf_imoveis_',
                  })
                  if (pageLinkedIg.id !== currentIgTarget) {
                    console.log(
                      '[INSTAGRAM_HEALTH] IG ID corrigido automaticamente: ' +
                        currentIgTarget +
                        ' -> ' +
                        pageLinkedIg.id,
                    )
                    userRecord.set('meta_instagram_business_id', pageLinkedIg.id)
                    if (pageLinkedIg.username) {
                      userRecord.set('instagram_username', pageLinkedIg.username)
                    }
                    try {
                      $app.saveNoValidate(userRecord)
                      currentIgTarget = pageLinkedIg.id
                    } catch (_) {}
                  }
                } else {
                  pageLinkedIg = { linked: false, id: null, username: null }
                  accessiblePages.push({
                    page_id: pageCandidateId,
                    page_name: tokenIdentity.name || 'Página do Token',
                    has_instagram: false,
                    ig_account_id: null,
                    ig_username: null,
                    matches_target_id: false,
                  })
                }
              }
            } catch (_) {}
          }

          if (pageLinkedIg && pageLinkedIg.linked === false) {
            const noIgMessage =
              "A Página '" +
              (tokenIdentity.name || 'BRF Imóveis') +
              "' NÃO tem nenhuma conta do Instagram vinculada. Vínculo necessário: no app do Instagram (logado na conta oficial @brf_imoveis_) → Configurações → Empresa/Ferramentas profissionais → 'Conectar uma Página do Facebook' → escolher a Página " +
              (tokenIdentity.name || 'BRF Imóveis') +
              '. Aguarde ~5 minutos e clique Verificar Agora.'
            results.push({
              name: 'Instagram Business',
              key: 'instagram',
              status: 'page_has_no_instagram',
              timestamp: ts,
              message: noIgMessage,
              app_id: igAppId,
              token_identity: tokenIdentity,
              accessible_pages: accessiblePages,
              tested_tokens: [
                {
                  type: oauthUserToken ? 'oauth_user_token' : 'saved_page_token',
                  token_suffix: maskTok(igToken),
                  status: 'page_has_no_instagram',
                },
              ],
            })
          } else if (currentIgTarget) {
            try {
              const igRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/' +
                  currentIgTarget +
                  '?fields=id,name,username' +
                  proofFor(igToken),
                method: 'GET',
                headers: { Authorization: 'Bearer ' + igToken },
                timeout: 15,
              })
              if (igRes.statusCode >= 200 && igRes.statusCode < 300) {
                connected = true
                verifiedName = (igRes.json && (igRes.json.name || igRes.json.username)) || ''
                testedTokens.push({
                  type: oauthUserToken ? 'oauth_user_token' : 'saved_page_token',
                  token_suffix: maskTok(igToken),
                  status: 'ok',
                  http_status: igRes.statusCode,
                })
              } else {
                savedGraphErr = extractErr(igRes.json, igRes.statusCode)
                console.log(
                  '[INSTAGRAM_HEALTH] token salvo falhou: HTTP ' +
                    savedGraphErr.http_status +
                    ' code=' +
                    (savedGraphErr.code !== null ? savedGraphErr.code : 'n/a') +
                    ' subcode=' +
                    (savedGraphErr.subcode !== null ? savedGraphErr.subcode : 'n/a') +
                    ' msg=' +
                    savedGraphErr.message,
                )
                testedTokens.push({
                  type: oauthUserToken ? 'oauth_user_token' : 'saved_page_token',
                  token_suffix: maskTok(igToken),
                  status: 'failed',
                  http_status: savedGraphErr.http_status,
                  graph_error: savedGraphErr,
                })
              }
            } catch (netErr) {
              const msg = String(netErr && netErr.message ? netErr.message : netErr)
              savedGraphErr = {
                http_status: 0,
                message: 'Erro de rede: ' + msg,
                code: null,
                subcode: null,
                user_msg: null,
              }
              console.log('[INSTAGRAM_HEALTH] token salvo erro de rede: ' + msg)
              testedTokens.push({
                type: oauthUserToken ? 'oauth_user_token' : 'saved_page_token',
                token_suffix: maskTok(igToken),
                status: 'network_error',
                graph_error: savedGraphErr,
              })
            }
          }
        } // fecha o else do pageLinkedIg.linked === false
        // Se ainda não conectado, tenta auto-obtenção via tokens Meta já salvos (a menos que já confirmamos que a página não tem IG)
        if (!connected && !(pageLinkedIg && pageLinkedIg.linked === false)) {
          const candidates = []
          if (sysUserToken) candidates.push({ token: sysUserToken, type: 'system_user' })
          if (capiToken && capiToken !== sysUserToken)
            candidates.push({ token: capiToken, type: 'capi' })

          for (let c = 0; c < candidates.length; c++) {
            const candItem = candidates[c]
            const cand = candItem.token
            const candType = candItem.type
            const candSuffix = maskTok(cand)
            try {
              // Teste direto com cand
              const dRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/' +
                  igBizId +
                  '?fields=id,name,username&access_token=' +
                  encodeURIComponent(cand) +
                  proofFor(cand),
                method: 'GET',
                timeout: 10,
              })
              if (dRes.statusCode >= 200 && dRes.statusCode < 300) {
                connected = true
                verifiedName = (dRes.json && (dRes.json.name || dRes.json.username)) || ''
                userRecord.set('meta_instagram_page_token', cand)
                if (!userRecord.getString('meta_page_access_token')) {
                  userRecord.set('meta_page_access_token', cand)
                }
                try {
                  $app.saveNoValidate(userRecord)
                } catch (_) {}
                testedTokens.push({
                  type: candType,
                  token_suffix: candSuffix,
                  status: 'ok',
                  http_status: dRes.statusCode,
                })
                break
              }

              const dErr = extractErr(dRes.json, dRes.statusCode)
              console.log(
                '[INSTAGRAM_HEALTH] auto-descoberta direct (' +
                  candType +
                  ') falhou: HTTP ' +
                  dErr.http_status +
                  ' code=' +
                  (dErr.code !== null ? dErr.code : 'n/a') +
                  ' subcode=' +
                  (dErr.subcode !== null ? dErr.subcode : 'n/a') +
                  ' msg=' +
                  dErr.message,
              )

              // Teste via me/accounts
              const accRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=' +
                  encodeURIComponent(cand) +
                  proofFor(cand),
                method: 'GET',
                timeout: 10,
              })
              if (accRes.statusCode === 200 && accRes.json && Array.isArray(accRes.json.data)) {
                const pages = accRes.json.data
                for (let p = 0; p < pages.length; p++) {
                  const pg = pages[p]
                  const pgToken = pg.access_token || ''
                  const pgIg = pg.instagram_business_account || {}
                  if (pgIg.id === igBizId || (!connected && pgToken)) {
                    connected = true
                    verifiedName = pgIg.name || pgIg.username || pg.name || ''
                    userRecord.set('meta_instagram_page_token', pgToken)
                    if (!userRecord.getString('meta_page_access_token')) {
                      userRecord.set('meta_page_access_token', pgToken)
                    }
                    try {
                      $app.saveNoValidate(userRecord)
                    } catch (_) {}
                    break
                  }
                }
                testedTokens.push({
                  type: candType,
                  token_suffix: candSuffix,
                  status: connected ? 'ok' : 'no_matching_page',
                  http_status: accRes.statusCode,
                })
                if (connected) break
              } else {
                const accErr = extractErr(accRes.json, accRes.statusCode)
                console.log(
                  '[INSTAGRAM_HEALTH] auto-descoberta me/accounts (' +
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
                  direct_error: dErr,
                  accounts_error: accErr,
                })
              }
            } catch (cErr) {
              console.log('[INSTAGRAM_HEALTH] candidato erro: ' + String(cErr))
              testedTokens.push({
                type: candType,
                token_suffix: candSuffix,
                status: 'network_error',
              })
            }
          }
        }

        // v0.0.1425 — sem contradição: se a leitura com proof confirmou a
        // identidade /me do token como uma Página (mesmo com /me/accounts
        // vazio, que é o normal para Page Token), o Painel de Saúde não pode
        // pintar "0 páginas" — a Página confirmada entra como página
        // acessível e o resultado segue connected.
        if (
          !connected &&
          !(pageLinkedIg && pageLinkedIg.linked === false) &&
          tokenIdentity &&
          !tokenIdentity.error &&
          tokenIdentity.id &&
          (tokenIdentity.type || '').indexOf('page') !== -1
        ) {
          const alreadyListed = accessiblePages.some(function (pg) {
            return String(pg.page_id) === String(tokenIdentity.id)
          })
          if (!alreadyListed) {
            accessiblePages.push({
              page_id: tokenIdentity.id,
              page_name: tokenIdentity.name || 'Página do Token',
              has_instagram: false,
              ig_account_id: null,
              ig_username: null,
              matches_target_id: false,
            })
          }
          connected = true
          if (!currentIgTarget) {
            userRecord.set('meta_instagram_business_id', tokenIdentity.id)
            try {
              $app.saveNoValidate(userRecord)
            } catch (_) {}
            currentIgTarget = tokenIdentity.id
          }
        }
        if (connected) {
          results.push({
            name: 'Instagram Business',
            key: 'instagram',
            status: 'connected',
            timestamp: ts,
            message: 'Conectado ✅' + (verifiedName ? ' — @' + verifiedName : ''),
            app_id: igAppId,
            token_identity: tokenIdentity,
            accessible_pages: accessiblePages,
            tested_tokens: testedTokens,
          })
        } else if (!(pageLinkedIg && pageLinkedIg.linked === false)) {
          // v0.0.1425 — motivo REAL da Meta vem primeiro: erro de
          // assinatura/permissão não pode virar "0 páginas" (a Graph falhou,
          // não devolveu lista vazia).
          if (savedGraphErr) {
            const errCode = savedGraphErr.code
            const errSubcode = savedGraphErr.subcode
            const errMsg = savedGraphErr.message || 'Token rejeitado pela Meta Graph API'
            const errCodeStr =
              errCode !== null
                ? ' (code ' + errCode + (errSubcode !== null ? ', subcode ' + errSubcode : '') + ')'
                : ''

            results.push({
              name: 'Instagram Business',
              key: 'instagram',
              status: errCode === 190 ? 'expired' : 'configured_waiting_token',
              timestamp: ts,
              message:
                'Leitura na Meta falhou: ' +
                errMsg +
                errCodeStr +
                ' — a chamada não chegou a listar Páginas.',
              app_id: igAppId,
              graph_error: savedGraphErr,
              code: errCode === 190 ? 190 : 0,
              subcode: errCode === 190 ? errSubcode || 0 : 0,
              token_identity: tokenIdentity,
              accessible_pages: accessiblePages,
              tested_tokens: testedTokens,
            })
          } else if (accessiblePages.length === 0) {
            const detailMsg =
              'A Meta não retornou Páginas em /me/accounts para o token salvo. Reconecte via OAuth com as permissões "pages_show_list" e "pages_read_engagement" selecionando a Página BRF Imóveis.'

            results.push({
              name: 'Instagram Business',
              key: 'instagram',
              status: 'configured_waiting_token',
              timestamp: ts,
              message: detailMsg,
              app_id: igAppId,
              graph_error: savedGraphErr,
              token_identity: tokenIdentity,
              accessible_pages: accessiblePages,
              tested_tokens: testedTokens,
            })
          } else {
            // Coletar permissões atuais apenas se não havia token salvo
            let missingPerms = []
            try {
              const pRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
                  encodeURIComponent(oauthUserToken || sysUserToken || capiToken) +
                  (oauthUserToken ? proofFor(oauthUserToken) : ''),
                method: 'GET',
                timeout: 10,
              })
              if (pRes.statusCode === 200 && pRes.json && Array.isArray(pRes.json.data)) {
                const granted = pRes.json.data
                  .filter((p) => p.status === 'granted')
                  .map((p) => p.permission)
                const hasBasic =
                  granted.indexOf('instagram_basic') !== -1 ||
                  granted.indexOf('instagram_business_basic') !== -1
                if (!hasBasic) missingPerms.push('instagram_basic')
              }
            } catch (_) {}

            const detailMsg =
              missingPerms.length > 0
                ? 'Faltam permissões na Meta (' +
                  missingPerms.join(', ') +
                  '). Conecte via OAuth para autorizar os escopos do Instagram.'
                : 'Instagram aguardando autorização via OAuth ou vínculo de Página.'

            results.push({
              name: 'Instagram Business',
              key: 'instagram',
              status: 'configured_waiting_token',
              timestamp: ts,
              message: detailMsg,
              app_id: igAppId,
              missing_perms: missingPerms,
              token_identity: tokenIdentity,
              accessible_pages: accessiblePages,
              tested_tokens: testedTokens,
            })
          }
        }
      }
    }

    if (shouldCheck('messenger')) {
      const pageToken =
        userRecord.getString('meta_page_access_token') ||
        userRecord.getString('meta_instagram_page_token')
      if (!pageToken) {
        results.push({
          name: 'Messenger',
          key: 'messenger',
          status: 'not_configured',
          timestamp: ts,
          message: 'Page Access Token não configurado',
        })
      } else {
        try {
          const msgRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/me?access_token=' + pageToken + proofFor(pageToken),
            method: 'GET',
            timeout: 15,
          })
          if (msgRes.statusCode >= 200 && msgRes.statusCode < 300) {
            var pageName = ''
            try {
              pageName = (msgRes.json && msgRes.json.name) || ''
            } catch (_) {}
            results.push({
              name: 'Messenger',
              key: 'messenger',
              status: 'connected',
              timestamp: ts,
              message: 'Conectado ✅' + (pageName ? ' — ' + pageName : ''),
            })
          } else {
            var mErr = {}
            try {
              mErr = msgRes.json && msgRes.json.error ? msgRes.json.error : {}
            } catch (_) {}
            var mCode = typeof mErr.code === 'number' ? mErr.code : 0
            var mSubcode = typeof mErr.error_subcode === 'number' ? mErr.error_subcode : 0
            results.push({
              name: 'Messenger',
              key: 'messenger',
              // code 190 = token morto (expirado/invalidado) — status 'expired'
              // para o cartão mostrar VERMELHO "Token expirado" (v0.0.1411).
              status: mCode === 190 ? 'expired' : 'error',
              timestamp: ts,
              message:
                mErr.message || 'Token inválido ou expirado (HTTP ' + msgRes.statusCode + ')',
              code: mCode,
              subcode: mSubcode,
            })
          }
        } catch (e5) {
          results.push({
            name: 'Messenger',
            key: 'messenger',
            status: 'error',
            timestamp: ts,
            message: 'Erro de rede: ' + (e5.message || 'unknown'),
          })
        }
      }
    }

    return e.json(200, { success: true, results: results, timestamp: ts })
  },
  $apis.requireAuth(),
)

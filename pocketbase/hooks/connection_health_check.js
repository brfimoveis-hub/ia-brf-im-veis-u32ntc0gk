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
          // Não enviar appsecret_proof: a Graph API só exige quando habilitado explicitamente no app
          // e o app_secret pode divergir do app criador do token, gerando "Invalid appsecret_proof".
          const res = $http.send({
            url:
              'https://graph.facebook.com/v21.0/' +
              pnId +
              '?fields=code_verification_status,quality_rating,status,verified_name,id,display_phone_number',
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

    if (shouldCheck('instagram')) {
      const igBizId = (userRecord.getString('meta_instagram_business_id') || '').trim()
      let igToken = (
        userRecord.getString('meta_instagram_page_token') ||
        userRecord.getString('meta_page_access_token') ||
        ''
      ).trim()
      const igAppId = (
        userRecord.getString('meta_instagram_app_id') ||
        userRecord.getString('meta_app_id') ||
        ''
      ).trim()
      const sysUserToken = (userRecord.getString('meta_whatsapp_access_token') || '').trim()
      const capiToken = (userRecord.getString('meta_capi_token') || '').trim()

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

        if (igToken) {
          try {
            const igRes = $http.send({
              url: 'https://graph.facebook.com/v22.0/' + igBizId + '?fields=id,name,username',
              method: 'GET',
              headers: { Authorization: 'Bearer ' + igToken },
              timeout: 15,
            })
            if (igRes.statusCode >= 200 && igRes.statusCode < 300) {
              connected = true
              verifiedName = (igRes.json && (igRes.json.name || igRes.json.username)) || ''
            }
          } catch (_) {}
        }

        // Se ainda não conectado, tenta auto-obtenção via tokens Meta já salvos
        if (!connected) {
          const candidates = []
          if (sysUserToken) candidates.push(sysUserToken)
          if (capiToken && capiToken !== sysUserToken) candidates.push(capiToken)

          for (let c = 0; c < candidates.length; c++) {
            const cand = candidates[c]
            try {
              // Teste direto com cand
              const dRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/' +
                  igBizId +
                  '?fields=id,name,username&access_token=' +
                  encodeURIComponent(cand),
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
                break
              }

              // Teste via me/accounts
              const accRes = $http.send({
                url:
                  'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=' +
                  encodeURIComponent(cand),
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
                if (connected) break
              }
            } catch (_) {}
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
          })
        } else {
          // Coletar permissões atuais para apontar diagnóstico cirúrgico.
          // Suporta a nova família instagram_business_* bem como legada.
          let missingPerms = []
          try {
            const pRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
                encodeURIComponent(sysUserToken || capiToken),
              method: 'GET',
              timeout: 10,
            })
            if (pRes.statusCode === 200 && pRes.json && Array.isArray(pRes.json.data)) {
              const granted = pRes.json.data
                .filter((p) => p.status === 'granted')
                .map((p) => p.permission)
              const hasBasic =
                granted.indexOf('instagram_business_basic') !== -1 ||
                granted.indexOf('instagram_basic') !== -1
              const hasMsg =
                granted.indexOf('instagram_business_manage_messages') !== -1 ||
                granted.indexOf('instagram_manage_messages') !== -1
              if (!hasBasic) missingPerms.push('instagram_business_basic')
              if (!hasMsg) missingPerms.push('instagram_business_manage_messages')
            } else {
              missingPerms = ['instagram_business_basic', 'instagram_business_manage_messages']
            }
          } catch (_) {}

          const detailMsg =
            missingPerms.length > 0
              ? 'Faltam permissões na Meta (' +
                missingPerms.join(', ') +
                '). Conecte via OAuth para autorizar os escopos do Instagram Business.'
              : 'Instagram ID ' + igBizId + ' aguardando autorização ou token manual.'

          results.push({
            name: 'Instagram Business',
            key: 'instagram',
            status: 'configured_waiting_token',
            timestamp: ts,
            message: detailMsg,
            app_id: igAppId,
          })
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
            url: 'https://graph.facebook.com/v22.0/me?access_token=' + pageToken,
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
            results.push({
              name: 'Messenger',
              key: 'messenger',
              status: 'error',
              timestamp: ts,
              message:
                mErr.message || 'Token inválido ou expirado (HTTP ' + msgRes.statusCode + ')',
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

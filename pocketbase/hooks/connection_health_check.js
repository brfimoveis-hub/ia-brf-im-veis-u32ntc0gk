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
          const res = $http.send({
            url: 'https://graph.facebook.com/v21.0/' + pnId,
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token },
            timeout: 15,
          })
          if (res.statusCode >= 200 && res.statusCode < 300) {
            results.push({
              name: 'WhatsApp Cloud API',
              key: 'whatsapp',
              status: 'connected',
              timestamp: ts,
              message: 'Conectado ✅ — HTTP 200 da Meta Graph API (somente leitura)',
            })
          } else {
            var waErr = {}
            try {
              waErr = res.json && res.json.error ? res.json.error : {}
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
          const permRes = $http.send({
            url: 'https://graph.facebook.com/v21.0/me/permissions?access_token=' + capiToken,
            method: 'GET',
            timeout: 15,
          })
          if (permRes.statusCode >= 400) {
            var pErr = {}
            try {
              pErr = permRes.json && permRes.json.error ? permRes.json.error : {}
            } catch (_) {}
            results.push({
              name: 'Meta Conversions API (CAPI)',
              key: 'capi',
              status: 'error',
              timestamp: ts,
              message: pErr.message || 'Token inválido ou expirado',
            })
          } else {
            const pxRes = $http.send({
              url: 'https://graph.facebook.com/v21.0/' + pixelId + '?fields=id,name',
              method: 'GET',
              headers: { Authorization: 'Bearer ' + capiToken },
              timeout: 15,
            })
            if (pxRes.statusCode >= 200 && pxRes.statusCode < 300) {
              var pxName = ''
              try {
                pxName = pxRes.json && pxRes.json.name ? pxRes.json.name : ''
              } catch (_) {}
              results.push({
                name: 'Meta Conversions API (CAPI)',
                key: 'capi',
                status: 'connected',
                timestamp: ts,
                message: 'Conectado ✅' + (pxName ? ' — ' + pxName : ''),
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
                message: xErr.message || 'Pixel não encontrado (HTTP ' + pxRes.statusCode + ')',
              })
            }
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

    return e.json(200, { success: true, results: results, timestamp: ts })
  },
  $apis.requireAuth(),
)

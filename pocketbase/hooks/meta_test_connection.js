routerAdd(
  'POST',
  '/backend/v1/meta_test_connection',
  (e) => {
    const body = e.requestInfo().body || {}

    // Verificação de Meta CAPI
    if (body.pixel_id) {
      const { business_id, pixel_id, access_token } = body

      if (!access_token || !pixel_id) {
        return e.badRequestError('Pixel ID e Access Token são obrigatórios para CAPI.')
      }

      const testUrl = 'https://graph.facebook.com/v21.0/' + pixel_id + '/events'

      const payload = {
        data: [
          {
            event_name: 'TestEvent',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system_generated',
            user_data: {
              client_ip_address: e.request.remoteAddr,
              client_user_agent: e.request.header.get('User-Agent') || 'TestAgent',
              external_id: business_id ? [$security.sha256(business_id)] : undefined,
            },
          },
        ],
      }

      const res = $http.send({
        url: testUrl,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, { status: 'connected', data: res.json })
      } else {
        const errorMsg = res.json?.error?.message || 'Falha de Handshake com Meta CAPI.'
        return e.badRequestError(errorMsg)
      }
    } else {
      // Verificação de WhatsApp Meta Cloud API
      const { business_id, phone_number_id, access_token } = body

      if (!business_id || !phone_number_id || !access_token) {
        return e.badRequestError(
          'Os campos Business ID, Phone Number ID e Access Token são obrigatórios.',
        )
      }

      const res = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          phone_number_id +
          '?fields=display_phone_number,name,quality_rating',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + access_token,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, { status: 'connected', data: res.json })
      } else {
        const errorMsg = res.json?.error?.message || 'Erro ao validar credenciais na Meta API.'

        if (
          errorMsg.includes('Unsupported get request') ||
          errorMsg.includes('Object with ID does not exist')
        ) {
          return e.badRequestError(
            `Falha na validação do Meta: ${errorMsg} (O Phone Number ID pode estar incorreto ou as permissões do token estão ausentes)`,
          )
        }

        // Retorna a mensagem de erro exata da API da Meta em vez de substituir
        return e.badRequestError(errorMsg)
      }
    }
  },
  $apis.requireAuth(),
)

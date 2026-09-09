routerAdd(
  'POST',
  '/backend/v1/diagnostic_capi',
  (e) => {
    let userRecord = null
    try {
      userRecord = $app.findRecordById('users', e.auth.id)
    } catch (_) {}

    if (!userRecord) {
      return e.json(200, { success: false, error: 'Usuário não encontrado.' })
    }

    const pixelId = userRecord.getString('meta_dataset_id') || userRecord.getString('meta_pixel_id')
    const accessToken = userRecord.getString('meta_capi_token')

    if (!pixelId || !accessToken) {
      return e.json(200, {
        success: false,
        error: 'Pixel/Dataset ID e Token CAPI não configurados.',
      })
    }

    try {
      // Tokens de CAPI do Events Manager são write-only (ou apenas read_ads_dataset_quality).
      // Requisições GET /{pixelId} sempre retornam erro de permissão.
      // O teste real é o envio de evento de teste no endpoint /events.
      const eventRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + pixelId + '/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        body: JSON.stringify({
          data: [
            {
              event_name: 'Lead',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'system_generated',
              user_data: {
                em: [$security.sha256('teste@brfimoveis.com.br')],
              },
            },
          ],
        }),
        timeout: 15,
      })

      if (eventRes.statusCode >= 200 && eventRes.statusCode < 300) {
        const eventsReceived = (eventRes.json && eventRes.json.events_received) || 0
        return e.json(200, {
          success: true,
          pixel_name: 'Dataset ' + pixelId,
          pixel_id: pixelId,
          events_received: eventsReceived,
        })
      }

      var pixelError = (eventRes.json && eventRes.json.error) || {}
      return e.json(200, {
        success: false,
        error:
          pixelError.message || 'Erro ao enviar evento CAPI (HTTP ' + eventRes.statusCode + ').',
        status_code: eventRes.statusCode,
      })
    } catch (err) {
      return e.json(200, {
        success: false,
        error: 'Falha de comunicação: ' + (err.message || 'unknown'),
      })
    }
  },
  $apis.requireAuth(),
)

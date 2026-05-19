routerAdd(
  'POST',
  '/backend/v1/meta_capi_test_connection',
  (e) => {
    const body = e.requestInfo().body || {}
    let pixelId = body.pixel_id
    let accessToken = body.access_token

    const user = e.auth
    if (user) {
      pixelId = pixelId || user.getString('meta_pixel_id')
      accessToken = accessToken || user.getString('meta_capi_token')
    }

    if (!pixelId || !accessToken) {
      throw new BadRequestError('Pixel ID e Token de Acesso são obrigatórios.')
    }

    const url = `https://graph.facebook.com/v20.0/${pixelId}/events`

    const payload = {
      data: [
        {
          event_name: 'TestEvent',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'system_generated',
          user_data: {
            client_user_agent: e.request.header.get('User-Agent') || 'TestAgent',
          },
        },
      ],
    }

    const res = $http.send({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, { success: true, data: res.json })
    }

    // Return the full Meta error to the client so it can identify the field
    return e.json(
      res.statusCode,
      res.json || { error: { message: `Erro da Meta API (Status ${res.statusCode})` } },
    )
  },
  $apis.requireAuth(),
)

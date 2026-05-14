routerAdd(
  'POST',
  '/backend/v1/meta/test-capi',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = body.pixelId
    const capiToken = body.capiToken

    if (!pixelId || !capiToken) {
      return e.badRequestError('Missing pixelId or capiToken')
    }

    const payload = {
      data: [
        {
          event_name: 'TestEvent',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'system_generated',
          user_data: {
            client_ip_address: e.request.remoteAddr,
            client_user_agent: e.requestInfo().headers['user-agent'] || 'PocketBase Server',
          },
        },
      ],
      test_event_code: 'TEST54321',
    }

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`
    const res = $http.send({
      url: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 15,
    })

    if (res.statusCode >= 400) {
      return e.badRequestError(res.json?.error?.message || 'CAPI test failed')
    }

    return e.json(200, { success: true, response: res.json })
  },
  $apis.requireAuth(),
)

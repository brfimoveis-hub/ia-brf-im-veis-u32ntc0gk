routerAdd(
  'POST',
  '/backend/v1/meta/test-capi',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = body.pixelId
    const capiToken = body.capiToken

    if (!pixelId || !capiToken) {
      return e.badRequestError('Pixel ID and CAPI Token are required')
    }

    const res = $http.send({
      url: `https://graph.facebook.com/v19.0/${pixelId}/events`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: 'TestEvent',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system_generated',
            user_data: { client_user_agent: 'SystemConnectionTest' },
          },
        ],
        access_token: capiToken,
      }),
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (e.auth) {
        const user = $app.findRecordById('users', e.auth.id)
        user.set('meta_token_status', 'valid')
        user.set('meta_pixel_id', pixelId)
        user.set('meta_capi_token', capiToken)
        $app.save(user)
      }
      return e.json(200, { success: true })
    } else {
      if (e.auth) {
        const user = $app.findRecordById('users', e.auth.id)
        user.set('meta_token_status', 'invalid')
        $app.save(user)
      }
      return e.badRequestError('Invalid CAPI Token or Pixel ID', res.json)
    }
  },
  $apis.requireAuth(),
)

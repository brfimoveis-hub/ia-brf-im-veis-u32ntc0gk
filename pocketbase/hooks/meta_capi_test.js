routerAdd(
  'POST',
  '/backend/v1/meta_capi_test',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = body.pixel_id
    const accessToken = body.access_token

    if (!pixelId || !accessToken) {
      return e.badRequestError('Pixel ID and Access Token are required.')
    }

    const url = `https://graph.facebook.com/v19.0/${pixelId}?access_token=${accessToken}`

    try {
      const res = $http.send({
        url: url,
        method: 'GET',
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, { success: true, data: res.json })
      } else {
        const errorMsg = res.json?.error?.message || 'Failed to validate credentials with Meta.'
        return e.badRequestError(errorMsg)
      }
    } catch (err) {
      return e.badRequestError(err.message || 'Network error while connecting to Meta.')
    }
  },
  $apis.requireAuth(),
)

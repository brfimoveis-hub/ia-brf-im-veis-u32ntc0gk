routerAdd(
  'POST',
  '/backend/v1/meta/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const { business_id, phone_number_id, access_token } = body

    if (!business_id || !phone_number_id || !access_token) {
      throw new BadRequestError('business_id, phone_number_id, and access_token are required')
    }

    const url = `https://graph.facebook.com/v19.0/${phone_number_id}`

    try {
      const res = $http.send({
        url: url,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, { success: true, data: res.json })
      } else {
        let errorMsg = 'Failed to connect to Meta API'
        if (res.json && res.json.error && res.json.error.message) {
          errorMsg = res.json.error.message
        }
        throw new BadRequestError(errorMsg)
      }
    } catch (err) {
      if (err.message) {
        throw new BadRequestError(err.message)
      }
      throw err
    }
  },
  $apis.requireAuth(),
)

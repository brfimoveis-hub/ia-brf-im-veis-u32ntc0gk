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
      const permRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/me/permissions?access_token=' + accessToken,
        method: 'GET',
        timeout: 15,
      })

      if (permRes.statusCode >= 400) {
        var permError = (permRes.json && permRes.json.error) || {}
        return e.json(200, {
          success: false,
          error: permError.message || 'Token inválido ou expirado.',
          status_code: permRes.statusCode,
        })
      }

      const pixelRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + pixelId + '?fields=id,name',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 15,
      })

      if (pixelRes.statusCode >= 200 && pixelRes.statusCode < 300) {
        return e.json(200, {
          success: true,
          pixel_name: (pixelRes.json && pixelRes.json.name) || '',
          pixel_id: pixelId,
        })
      }

      var pixelError = (pixelRes.json && pixelRes.json.error) || {}
      return e.json(200, {
        success: false,
        error: pixelError.message || 'Pixel não encontrado (HTTP ' + pixelRes.statusCode + ').',
        status_code: pixelRes.statusCode,
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

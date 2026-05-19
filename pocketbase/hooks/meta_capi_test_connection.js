routerAdd(
  'POST',
  '/backend/v1/meta_capi_test_connection',
  (e) => {
    const body = e.requestInfo().body || {}
    let pixelId = body.pixel_id
    let accessToken = body.access_token
    let businessId = body.business_id

    const user = e.auth
    if (user) {
      pixelId = pixelId || user.getString('meta_pixel_id')
      accessToken = accessToken || user.getString('meta_capi_token')
      if (!businessId) {
        businessId = user.getString('meta_whatsapp_business_id')
      }
    }

    if (!pixelId || !accessToken) {
      throw new BadRequestError('Pixel ID e Token de Acesso são obrigatórios.')
    }

    const permUrl = `https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`
    const permRes = $http.send({ url: permUrl, method: 'GET', timeout: 15 })

    if (permRes.statusCode >= 400) {
      throw new BadRequestError('Token de Acesso inválido ou expirado.')
    }

    const perms = permRes.json?.data || []
    const grantedPerms = perms.filter((p) => p.status === 'granted').map((p) => p.permission)

    const requiredPerms = ['ads_management', 'business_management', 'ads_read']
    const missingPerms = requiredPerms.filter((p) => !grantedPerms.includes(p))

    if (missingPerms.length > 0) {
      throw new BadRequestError(`Permissões insuficientes. Faltam: ${missingPerms.join(', ')}`)
    }

    $app.logger().info('CAPI Test Info', 'pixelId', pixelId, 'businessId', businessId)

    const url = `https://graph.facebook.com/v21.0/${pixelId}/events`

    const payload = {
      data: [
        {
          event_name: 'TestEvent',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'system_generated',
          user_data: {
            client_ip_address: (e.request.remoteAddr || '127.0.0.1').split(':')[0],
            client_user_agent: e.request.header.get('User-Agent') || 'TestAgent',
            em: [$security.sha256('test@example.com')],
            ph: [$security.sha256('5511999999999')],
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
      if (user) {
        user.set('meta_pixel_id', pixelId)
        user.set('meta_capi_token', accessToken)
        if (businessId) {
          user.set('meta_whatsapp_business_id', businessId)
          user.set('meta_whatsapp_status', 'active')
        }
        user.set('meta_token_status', 'valid')
        try {
          $app.saveNoValidate(user)
        } catch (err) {
          $app.logger().error('Failed to sync CAPI test success to user', 'err', err.message)
        }
      }
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

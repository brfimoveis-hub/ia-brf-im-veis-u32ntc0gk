routerAdd(
  'POST',
  '/backend/v1/uazapi/disconnect',
  (e) => {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Não autorizado')

    const instance = user.getString('uazapi_instance_number')
    let domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    const token = user.getString('uazapi_token')

    if (!instance) throw new BadRequestError('Número da instância não configurado.')

    try {
      // Call Evolution API logout endpoint
      $http.send({
        url: `${domain}/instance/logout/${instance}`,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          apikey: token,
          Authorization: 'Bearer ' + token,
        },
        timeout: 15,
      })

      // IMPORTANT: Do NOT clear uazapi_domain, uazapi_token, or uazapi_instance_number
      // Only update the connection status
      user.set('uazapi_status', 'disconnected')
      user.set('uazapi_error', 'Desconectado manualmente')
      $app.saveNoValidate(user)

      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('type', 'uazapi_config')
        log.set('message', 'UAZAPI Disconnect: instância desconectada')
        log.set('details', { instance: instance })
        log.set('payload', { action: 'disconnect', status: 'disconnected' })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Instância desconectada com sucesso.',
      })
    } catch (err) {
      // Even if API call fails (e.g. already disconnected), we update local state
      user.set('uazapi_status', 'disconnected')
      user.set('uazapi_error', 'Desconectado (erro na API: ' + err.message + ')')
      $app.saveNoValidate(user)

      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('type', 'uazapi_config')
        log.set('message', 'UAZAPI Disconnect: desconectado localmente (erro na API)')
        log.set('details', { instance: instance, error: err.message })
        log.set('payload', { action: 'disconnect_forced', status: 'disconnected' })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Forçado o status desconectado localmente.',
      })
    }
  },
  $apis.requireAuth(),
)

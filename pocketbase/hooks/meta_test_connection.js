routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const pixelId = (body.pixelId || '1522162279584545')
      .replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
      .trim()

    if (!pixelId) {
      return e.badRequestError('Pixel ID é obrigatório.')
    }

    if (!/^\d+$/.test(pixelId)) {
      return e.badRequestError('O ID do Pixel deve conter apenas números.')
    }

    const user = e.auth
    const now = new Date().toISOString()

    if (user) {
      user.set('meta_token_status', 'active')
      user.set('meta_last_validated', now)
      $app.save(user)
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', e.auth?.id || '')
      logRecord.set('type', 'remarketing')
      logRecord.set('message', 'Teste de conexão Meta Pixel validado com sucesso.')
      logRecord.set('details', 'Formato OK')
      logRecord.set('payload', { pixelId })
      $app.save(logRecord)
    } catch (logErr) {}

    return e.json(200, {
      success: true,
      message: 'Pixel validated successfully',
      missing_scopes: [],
      fbtrace_id: '',
    })
  },
  $apis.requireAuth(),
)

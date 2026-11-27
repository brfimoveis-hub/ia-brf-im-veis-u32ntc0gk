/**
 * REDEFINIÇÃO DE SENHA — ROTA PRÓPRIA DE SOLICITAÇÃO (v0.0.1497)
 *
 * Problema provado pelos logs (27/11/2026): a rota NATIVA
 * POST /api/collections/users/request-password-reset nunca apareceu no log de
 * requests, o stream de emails ficou vazio e nenhum erro de hook foi registrado —
 * a tentativa do usuário morria antes de qualquer envio observável.
 *
 * Solução: rota própria que (1) localiza o usuário, (2) gera o token de reset
 * nativo (record.newPasswordResetToken()), (3) envia o email direto via
 * $app.newMailClient() (mesmo caminho já provado em bulk_send_email.js,
 * process_email_campaign.js e send_email.js) e (4) LOGA cada etapa.
 * O link aponta para {SITE_URL}/reset-password?token=... (página do app).
 *
 * Não altera nada do motor da Bia/régua/Maestro (REGRA DE OURO).
 */
routerAdd('POST', '/backend/v1/request-password-reset', (e) => {
  const body = e.requestInfo().body || {}
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    return e.badRequestError('O campo email é obrigatório')
  }

  $app.logger().warn('[PWD_RESET] Solicitação recebida', 'email', email)

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    $app.logger().warn('[PWD_RESET] Usuário não encontrado', 'email', email)
    return e.notFoundError('Usuário não encontrado.')
  }

  let token = ''
  try {
    token = user.newPasswordResetToken()
  } catch (err) {
    $app.logger().error('[PWD_RESET] Falha ao gerar token', 'error', String(err && err.message))
    return e.json(500, { sent: false, error: 'Falha ao gerar token de redefinição.' })
  }
  if (!token) {
    $app.logger().error('[PWD_RESET] Token vazio', 'user', user.id)
    return e.json(500, { sent: false, error: 'Falha ao gerar token de redefinição.' })
  }

  let siteUrl = ($os.getenv('SITE_URL') || '').replace(/\/+$/, '')
  if (!siteUrl) {
    try {
      const ref = $os.getenv('PB_INSTANCE_URL') || ''
      if (ref.indexOf('internal.goskip.dev') !== -1) {
        const sub = ref.split('//')[1].split('.')[0].replace(/-\d+$/, '')
        siteUrl = 'https://' + sub + '.goskip.app'
      }
    } catch (_) {}
  }
  if (!siteUrl) {
    siteUrl = 'https://' + e.request.host
  }

  const resetLink = siteUrl + '/reset-password?token=' + token
  const userName = user.getString('name') || 'Usuário BRF Imóveis'
  const userEmail = user.getString('email') || email

  const htmlBody =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">' +
    '<h2 style="color:#16a34a;margin:0 0 12px;">Redefinição de senha — BRF Imóveis</h2>' +
    '<p>Olá ' +
    userName +
    ',</p>' +
    '<p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>' +
    '<p style="margin:24px 0;">' +
    '<a href="' +
    resetLink +
    '" style="background:#22c55e;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Criar nova senha</a>' +
    '</p>' +
    '<p>Se o botão não funcionar, copie e cole este link no navegador:</p>' +
    '<p style="word-break:break-all;color:#2563eb;">' +
    resetLink +
    '</p>' +
    '<p style="color:#888;font-size:12px;margin-top:24px;">Se você não solicitou esta alteração, ignore este email. O link expira em 30 minutos.</p>' +
    '</div>'

  try {
    const mailClient = $app.newMailClient()
    const message = new MailMessage({
      from: { name: 'BRF Imóveis', address: 'noreply@brfimoveis.com.br' },
      to: [{ name: userName, address: userEmail }],
      subject: 'Redefinição de senha — BRF Imóveis',
      html: htmlBody,
    })
    mailClient.send(message)
  } catch (err) {
    $app
      .logger()
      .error(
        '[PWD_RESET] FALHA no envio do email',
        'error',
        String(err && err.message),
        'to',
        userEmail,
      )
    return e.json(500, {
      sent: false,
      error:
        'Falha ao enviar o email de redefinição: ' +
        (err && err.message ? err.message : 'erro desconhecido'),
    })
  }

  $app.logger().warn('[PWD_RESET] Email de redefinição ENVIADO', 'to', userEmail, 'link', resetLink)

  return e.json(200, { sent: true })
})

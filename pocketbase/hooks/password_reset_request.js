/**
 * REDEFINIÇÃO DE SENHA — ROTA PRÓPRIA DE SOLICITAÇÃO (v0.0.1500)
 *
 * Causa raiz provada nos logs (27/11/2026 21:10 UTC):
 *  1. O envio usava `from: noreply@brfimoveis.com.br` (endereço SEM permissão
 *     no relay SMTP da plataforma) — a tentativa de envio falhava no servidor
 *     SMTP e o catch devolvia 500 com o motivo REAL, que o frontend descartava
 *     e mostrava o erro genérico.
 *  2. `$app.logger()` NÃO aparece no stream "hooks" dos logs (só console.*).
 *     Trocado por console.warn/console.error para diagnóstico imediato.
 *
 * Correção: envia com o sender NATIVO da plataforma ($app.settings().meta.*,
 * mesmo remetente do email nativo de reset do PocketBase) + 1 retry após 1s
 * + resposta com motivo específico. O link aponta para {SITE_URL}/reset-password.
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

  console.log('[PWD_RESET] Solicitação recebida para ' + email)

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    console.warn('[PWD_RESET] Usuário não encontrado: ' + email)
    return e.notFoundError('Usuário não encontrado. Verifique o email digitado.')
  }

  let token = ''
  try {
    token = user.newPasswordResetToken()
  } catch (err) {
    console.error('[PWD_RESET] Falha ao gerar token: ' + String(err && err.message))
    return e.json(500, { sent: false, error: 'Falha ao gerar token de redefinição.' })
  }
  if (!token) {
    console.error('[PWD_RESET] Token vazio para user=' + user.id)
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

  // Sender nativo da plataforma (mesmo remetente do email de reset nativo do PB)
  let fromAddress = 'noreply@brfimoveis.com.br'
  let fromName = 'BRF Imóveis'
  try {
    const meta = $app.settings().meta
    if (meta && meta.senderAddress) {
      fromAddress = meta.senderAddress
      if (meta.senderName) fromName = meta.senderName
    }
  } catch (settingsErr) {
    console.warn('[PWD_RESET] settings().meta indisponível: ' + String(settingsErr))
  }

  const buildMessage = () =>
    new MailerMessage({
      from: { name: fromName, address: fromAddress },
      to: [{ name: userName, address: userEmail }],
      subject: 'Redefinição de senha — BRF Imóveis',
      html: htmlBody,
    })

  let lastErr = ''
  try {
    try {
      $app.newMailClient().send(buildMessage())
    } catch (firstErr) {
      lastErr = String((firstErr && firstErr.message) || firstErr)
      console.error('[PWD_RESET] 1a tentativa falhou: ' + lastErr + ' — retry em 1s')
      // retry único após 1s (instabilidade pontual do SMTP)
      const until = Date.now() + 1000
      while (Date.now() < until) {}
      $app.newMailClient().send(buildMessage())
    }
  } catch (err) {
    const motivo = String((err && err.message) || err)
    console.error('[PWD_RESET] FALHA DEFINITIVA no envio (sender=' + fromAddress + '): ' + motivo)
    return e.json(500, {
      sent: false,
      error:
        'Servidor de email indisponível (' +
        motivo.slice(0, 120) +
        '). Tente novamente em alguns minutos.',
    })
  }

  console.log('[PWD_RESET] Email ENVIADO para ' + userEmail + ' (sender=' + fromAddress + ')')

  return e.json(200, { sent: true })
})

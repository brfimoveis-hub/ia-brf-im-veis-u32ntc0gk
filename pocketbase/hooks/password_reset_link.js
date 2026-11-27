/**
 * Corrige o link do email de redefinição de senha.
 *
 * Sem isto, o PocketBase envia o link nativo {APP_URL}/_/#/auth/confirm-password-reset?token=...,
 * que abre o painel do próprio backend — o usuário "cai direto na senha" sem conseguir concluir
 * a alteração, pois o token nunca chega à página /reset-password do app.
 *
 * Este hook reescreve o link para: {SITE_URL}/reset-password?token=... (a página React
 * que chama confirmPasswordReset com nova senha + confirmação).
 *
 * A URL do frontend vem do env SITE_URL (definido no painel Skip Cloud).
 * Fallback: deriva o domínio público (*.goskip.app) do hostname do backend.
 * Não altera o token nem a validade — apenas o destino do link.
 */
onMailerSend((e) => {
  const message = e.message

  // Ajusta APENAS o email de redefinição de senha (template nativo confirm-password-reset)
  if (message && message.html && message.html.indexOf('confirm-password-reset') !== -1) {
    const tokenMatch = message.html.match(/confirm-password-reset\?token=([A-Za-z0-9_\-.]+)/)
    if (tokenMatch) {
      const token = tokenMatch[1]
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
      if (siteUrl) {
        const newLink = siteUrl + '/reset-password?token=' + token
        message.html = message.html.replace(
          /https?:\/\/[^\s"'<>]+\/_\/#\/auth\/confirm-password-reset\?token=[A-Za-z0-9_\-.]+/g,
          newLink,
        )
        if (message.text) {
          message.text = message.text.replace(
            /https?:\/\/[^\s"<>]+\/_\/#\/auth\/confirm-password-reset\?token=[A-Za-z0-9_\-.]+/g,
            newLink,
          )
        }
      }
    }
  }

  e.next()
}, 'users')

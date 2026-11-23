// ONE-SHOT (temporário): reset da senha da conta de administração do CRM,
// acordado com o Mauro. O CRM não tem SMTP configurado, então
// /forgot-password nunca entregaria o e-mail — o reset precisa ser direto.
//
// Segurança: a senha NUNCA é gravada em log ou system_logs. O hook é
// TEMPORÁRIO e será APAGADO do projeto antes do commit.
//
// Mecanismo nativo de auth do PocketBase: record.set('password', ...) +
// $app.save(record) — o PocketBase gera o hash no campo de autenticação.
// tokenKey é regenerada, o que invalida TODAS as sessões/tokens antigos.
cronAdd('one_shot_pw_reset', '* * * * *', () => {
  // Payload embutido — JSVM não compartilha declarações top-level com callbacks.
  const email = 'brfimoveis@gmail.com'
  const newPass = '@Papaidoceu2023'

  let user = null
  try {
    user = $app.findFirstRecordByFilter('users', 'email = {:email}', { email: email })
  } catch (_) {
    console.log('[PW_RESET] usuario nao encontrado')
    return
  }
  if (!user) {
    console.log('[PW_RESET] usuario nao encontrado')
    return
  }

  // Troca da senha pelo mecanismo nativo (hash gerado pelo PocketBase) +
  // regeneração da tokenKey (invalida sessões antigas). Nada mais é alterado.
  try {
    user.set('password', newPass)
    user.set('tokenKey', $security.randomString(30))
    $app.save(user)
  } catch (err) {
    console.log('[PW_RESET] falha ao salvar registro')
    return
  }

  // PROVA: autenticação real contra a API nativa do PocketBase com a nova
  // senha. O token é logado APENAS como prefixo (8 chars) — o token nunca sai
  // inteiro, e a senha NUNCA é logada.
  let authOk = false
  let tokenPrefix = ''
  let authError = ''
  let base = String($os.getenv('PB_INSTANCE_URL') || '').replace(/\/+$/, '')
  if (base) {
    try {
      const authRes = $http.send({
        url: base + '/api/collections/users/auth-with-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password: newPass }),
        timeout: 15,
      })
      if (authRes.statusCode >= 200 && authRes.statusCode < 300) {
        authOk = true
        try {
          tokenPrefix = String((authRes.json || {}).token || '').slice(0, 8)
        } catch (_) {}
      } else {
        authError = 'HTTP ' + authRes.statusCode
      }
    } catch (err2) {
      authError = 'erro de rede'
    }
  } else {
    authError = 'PB_INSTANCE_URL ausente'
  }

  console.log(
    '[PW_RESET] reset concluido | auth_with_new_password=' +
      (authOk ? 'OK token=' + tokenPrefix + '...' : 'FALHOU ' + authError),
  )
})

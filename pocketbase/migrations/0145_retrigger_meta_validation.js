// Migration 0145: Re-dispara validação para extrair mensagens detalhadas
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    user.set('meta_run_trigger', 'true')
    app.saveNoValidate(user)
    console.log('[MIG_0145] meta_run_trigger ativado novamente')
  },
  (app) => {},
)

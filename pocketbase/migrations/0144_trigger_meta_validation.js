// Migration 0144: Dispara hook de validação e subscribed_apps para o novo token
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    user.set('meta_run_trigger', 'true')
    app.saveNoValidate(user)
    console.log('[MIG_0144] meta_run_trigger ativado para g5jto8bhulw01bz')
  },
  (app) => {},
)

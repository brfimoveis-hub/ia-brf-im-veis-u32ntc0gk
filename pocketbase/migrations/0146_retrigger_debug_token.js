// Migration 0146: Re-testa com token como debug token
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    user.set('meta_run_trigger', 'true')
    app.saveNoValidate(user)
    console.log('[MIG_0146] meta_run_trigger ativado')
  },
  (app) => {},
)
